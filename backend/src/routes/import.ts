import { Router } from 'express';
import axios from 'axios';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import { rankTracks } from '../lib/musicRanking';
import type { MusicTrack } from '../lib/musicRanking';

const execPromise = util.promisify(exec);
const router = Router();

// ── Invidious instances (reused from music.ts) ──────────────────────
const INVIDIOUS_INSTANCES = [
  'https://vid.puffyan.us',
  'https://invidious.fdn.fr',
  'https://invidious.privacyredirect.com',
  'https://inv.nadeko.net',
];

// ── Provider detection ──────────────────────────────────────────────
function detectProvider(url: string): 'spotify' | 'youtube' | null {
  if (/open\.spotify\.com\/playlist\//i.test(url)) return 'spotify';
  if (/youtube\.com\/playlist|youtu\.be\/.*list=/i.test(url)) return 'youtube';
  return null;
}

// ── Extract Spotify playlist ID ─────────────────────────────────────
function extractSpotifyPlaylistId(url: string): string | null {
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return match?.[1] ?? null;
}

// ── Extract YouTube playlist ID ─────────────────────────────────────
function extractYouTubePlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

// ── Spotify: scrape track names from public embed page ──────────────
async function scrapeSpotifyPlaylist(playlistId: string): Promise<{ name: string; tracks: string[] }> {
  // Use the Spotify embed endpoint which doesn't require auth
  const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
  
  try {
    const { data: html } = await axios.get(embedUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    // Extract playlist name from title tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let playlistName = titleMatch ? titleMatch[1].replace(/\s*[-–|]?\s*Spotify\s*$/i, '').trim() : 'Imported Spotify Playlist';

    // Try to extract track data from the embedded JSON/script content
    const tracks: string[] = [];

    // Method 1: Look for track data in script tags (resource JSON)
    const scriptMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
    if (scriptMatch) {
      try {
        const jsonData = JSON.parse(scriptMatch[1]);
        const items = jsonData?.props?.pageProps?.state?.data?.entity?.trackList || [];
        for (const item of items) {
          if (item.title && item.subtitle) {
            tracks.push(`${item.title} ${item.subtitle}`);
          } else if (item.title) {
            tracks.push(item.title);
          }
        }
      } catch { /* JSON parse failed, try other methods */ }
    }

    // Method 2: Look for track names in meta/og tags or structured data
    if (tracks.length === 0) {
      const trackMatches = html.matchAll(/"track":\s*\{[^}]*"name":\s*"([^"]+)"[^}]*"artists?":\s*\[?\s*\{[^}]*"name":\s*"([^"]+)"/g);
      for (const m of trackMatches) {
        tracks.push(`${m[1]} ${m[2]}`);
      }
    }

    // Method 3: Extract from the raw HTML data attributes or embedded player data
    if (tracks.length === 0) {
      const dataMatches = html.matchAll(/data-testid="tracklist-row"[^>]*>.*?<span[^>]*>([^<]+)<\/span>/gs);
      for (const m of dataMatches) {
        if (m[1] && m[1].length > 2) tracks.push(m[1]);
      }
    }

    // Method 4: Try the Spotify oEmbed API for metadata
    if (tracks.length === 0) {
      try {
        const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/playlist/${playlistId}`;
        const { data: oembed } = await axios.get(oembedUrl, { timeout: 5000 });
        if (oembed.title) {
          playlistName = oembed.title;
        }
      } catch { /* oembed failed */ }
    }

    // Method 5: Use anonymous Spotify API (no auth) to get track listing
    if (tracks.length === 0) {
      try {
        // Get anonymous access token from Spotify's public embed token endpoint
        const tokenResp = await axios.get('https://open.spotify.com/get_access_token?reason=transport&productType=embed', {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        const accessToken = tokenResp.data?.accessToken;
        
        if (accessToken) {
          const apiResp = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
            timeout: 8000,
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          
          if (apiResp.data?.name) {
            playlistName = apiResp.data.name;
          }
          
          const items = apiResp.data?.tracks?.items || [];
          for (const item of items) {
            const track = item.track;
            if (track?.name && track?.artists?.[0]?.name) {
              tracks.push(`${track.name} ${track.artists[0].name}`);
            } else if (track?.name) {
              tracks.push(track.name);
            }
          }
          
          // Handle pagination if more than 100 tracks
          let nextUrl = apiResp.data?.tracks?.next;
          while (nextUrl && tracks.length < 200) {
            try {
              const nextResp = await axios.get(nextUrl, {
                timeout: 5000,
                headers: { 'Authorization': `Bearer ${accessToken}` },
              });
              const nextItems = nextResp.data?.items || [];
              for (const item of nextItems) {
                const track = item.track;
                if (track?.name && track?.artists?.[0]?.name) {
                  tracks.push(`${track.name} ${track.artists[0].name}`);
                } else if (track?.name) {
                  tracks.push(track.name);
                }
              }
              nextUrl = nextResp.data?.next;
            } catch { break; }
          }
        }
      } catch (e) {
        console.log('⚠ Spotify anonymous API failed:', (e as any)?.message);
      }
    }

    return { name: playlistName, tracks };
  } catch (err) {
    console.error('❌ Spotify scrape error:', (err as any)?.message);
    throw new Error('Failed to fetch Spotify playlist. Make sure the playlist is public.');
  }
}

// ── YouTube: extract track names via Invidious API ──────────────────
async function scrapeYouTubePlaylist(playlistId: string): Promise<{ name: string; tracks: { title: string; artist: string; videoId: string }[] }> {
  // Try Invidious instances first
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/playlists/${playlistId}`;
      const { data } = await axios.get(url, { timeout: 8000 });
      
      const name = data.title || 'Imported YouTube Playlist';
      const tracks = (data.videos || []).map((v: any) => ({
        title: v.title || 'Unknown',
        artist: v.author || 'Unknown Artist',
        videoId: v.videoId || '',
      }));
      
      if (tracks.length > 0) {
        console.log(`✓ YouTube playlist scraped via ${instance}: ${tracks.length} tracks`);
        return { name, tracks };
      }
    } catch (err) {
      console.log(`⚠ Invidious playlist ${instance} failed:`, (err as any)?.message);
      continue;
    }
  }

  // Fallback: use yt-dlp to extract playlist
  try {
    console.log('🔄 Falling back to yt-dlp for YouTube playlist...');
    // Try programmatic API first
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ytdl = require('youtube-dl-exec');
      if (typeof ytdl === 'function') {
        console.log('▶ Using programmatic youtube-dl-exec API for playlist');
        const out = await ytdl(`https://www.youtube.com/playlist?list=${playlistId}`, {
          flatPlaylist: true,
          dumpJson: true,
          noWarnings: true,
          ignoreErrors: true,
        });
        let stdout = '';
        if (typeof out === 'string') stdout = out;
        else if ((out as any)?.stdout) stdout = (out as any).stdout;
        else stdout = String(out || '');

        const entries = stdout
          .split('\n')
          .map((line: string) => line.trim())
          .filter(Boolean)
          .map((line: string) => { try { return JSON.parse(line); } catch { return null; } })
          .filter(Boolean);

        const name = entries[0]?.playlist_title || 'Imported YouTube Playlist';
        const tracks = entries.map((e: any) => ({
          title: e.title || 'Unknown',
          artist: e.uploader || e.channel || 'Unknown Artist',
          videoId: e.id || '',
        }));

        return { name, tracks };
      }
    } catch (apiErr) {
      console.log('⚠ programmatic youtube-dl-exec failed for playlist, falling back to CLI:', (apiErr as any)?.message || apiErr);
    }

    // CLI fallback
    const base = path.resolve(__dirname, '../../node_modules/youtube-dl-exec/bin');
    const candidates = [path.join(base, 'yt-dlp'), path.join(base, 'yt-dlp.exe'), path.join(base, 'yt-dlp.cmd')];
    let binary = candidates.find(c => { try { return fs.existsSync(c); } catch { return false; } });
    if (!binary) {
      binary = path.join(base, 'yt-dlp.exe');
      console.warn('⚠ yt-dlp binary not found in expected locations, falling back to', binary);
    } else {
      console.log('✓ Found yt-dlp binary at:', binary);
    }

    const cmd = `"${binary}" "https://www.youtube.com/playlist?list=${playlistId}" --flat-playlist --dump-json --no-warnings --ignore-errors`;
    console.log('▶ Executing command:', cmd);
    try {
      const { stdout } = await execPromise(cmd, { maxBuffer: 1024 * 1024 * 50, timeout: 30000 });
      const entries = String(stdout)
        .split('\n')
        .map((line: string) => line.trim())
        .filter(Boolean)
        .map((line: string) => { try { return JSON.parse(line); } catch { return null; } })
        .filter(Boolean);

      const name = entries[0]?.playlist_title || 'Imported YouTube Playlist';
      const tracks = entries.map((e: any) => ({
        title: e.title || 'Unknown',
        artist: e.uploader || e.channel || 'Unknown Artist',
        videoId: e.id || '',
      }));

      return { name, tracks };
    } catch (err) {
      console.error('❌ yt-dlp playlist error (CLI fallback):', (err as any)?.message || err);
      throw new Error('Failed to fetch YouTube playlist. Make sure the playlist is public.');
    }
  } catch (err) {
    console.error('❌ yt-dlp playlist error (outer):', (err as any)?.message || err);
    throw new Error('Failed to fetch YouTube playlist. Make sure the playlist is public.');
  }
}

// ── Search for a single track using yt-dlp (reliable) with Invidious fast-path ──
async function searchSingleTrack(query: string): Promise<MusicTrack | null> {
  // Fast path: try ONE Invidious instance first (quick, but may fail)
  try {
    const instance = INVIDIOUS_INSTANCES[Math.floor(Math.random() * INVIDIOUS_INSTANCES.length)];
    const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`;
    const { data } = await axios.get(url, { timeout: 2500 });
    
    if (Array.isArray(data) && data.length > 0) {
      const videos = data.filter((v: any) => v.type === 'video').slice(0, 5);
      if (videos.length > 0) {
        const mapped = videos.map((video: any) => ({
          id: video.videoId,
          title: video.title,
          artist: video.author || 'Unknown Artist',
          thumbnail: video.videoThumbnails?.[4]?.url || video.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${video.videoId}/0.jpg`,
          duration: video.lengthSeconds || 0,
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
        }));

        const ranked = rankTracks(query, mapped, {
          limit: 1,
          minDuration: 30,
          maxDuration: 720,
          preferOriginals: true,
        });

        if (ranked[0]) return ranked[0];
      }
    }
  } catch {
    // Invidious failed — fall through to yt-dlp
  }

  // Reliable fallback: yt-dlp local search
  try {
    // Try programmatic API first
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ytdl = require('youtube-dl-exec');
      if (typeof ytdl === 'function') {
        console.log('▶ Using programmatic youtube-dl-exec API for single-track search');
        const out = await ytdl(`ytsearch3:${query}`, {
          dumpJson: true,
          flatPlaylist: true,
          noPlaylist: true,
          ignoreErrors: true,
          noWarnings: true,
        });
        let stdout = '';
        if (typeof out === 'string') stdout = out;
        else if ((out as any)?.stdout) stdout = (out as any).stdout;
        else stdout = String(out || '');

        const results = stdout
          .split('\n')
          .map((line: string) => line.trim())
          .filter(Boolean)
          .map((line: string) => { try { return JSON.parse(line); } catch { return null; } })
          .filter(Boolean)
          .map((video: any) => ({
            id: video.id || video.videoId || '',
            title: video.title || 'Unknown Title',
            artist: video.uploader || video.channel || video.artist || 'Unknown Artist',
            thumbnail: video.thumbnails?.[0]?.url || video.thumbnail || `https://img.youtube.com/vi/${video.id}/0.jpg`,
            duration: video.duration || 0,
            url: video.url || video.webpage_url || `https://www.youtube.com/watch?v=${video.id}`,
          }));

        if (results.length > 0) {
          const ranked = rankTracks(query, results, {
            limit: 1,
            minDuration: 30,
            maxDuration: 720,
            preferOriginals: true,
          });
          return ranked[0] || results[0] || null;
        }
      }
    } catch (apiErr) {
      console.log('⚠ programmatic youtube-dl-exec failed for single-track search, falling back to CLI:', (apiErr as any)?.message || apiErr);
    }

    const base = path.resolve(__dirname, '../../node_modules/youtube-dl-exec/bin');
    const candidates = [path.join(base, 'yt-dlp'), path.join(base, 'yt-dlp.exe'), path.join(base, 'yt-dlp.cmd')];
    let binary = candidates.find(c => { try { return fs.existsSync(c); } catch { return false; } });
    if (!binary) {
      binary = path.join(base, 'yt-dlp.exe');
      console.warn('⚠ yt-dlp binary not found in expected locations, falling back to', binary);
    } else {
      console.log('✓ Found yt-dlp binary at:', binary);
    }

    const cmd = `"${binary}" "ytsearch3:${query}" --dump-json --no-playlist --ignore-errors --no-warnings --flat-playlist`;
    console.log('▶ Executing command:', cmd);
    const { stdout } = await execPromise(cmd, { maxBuffer: 1024 * 1024 * 5, timeout: 12000 });

    const results = stdout
      .split('\n')
      .map((line: string) => line.trim())
      .filter(Boolean)
      .map((line: string) => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean)
      .map((video: any) => ({
        id: video.id || video.videoId || '',
        title: video.title || 'Unknown Title',
        artist: video.uploader || video.channel || video.artist || 'Unknown Artist',
        thumbnail: video.thumbnails?.[0]?.url || video.thumbnail || `https://img.youtube.com/vi/${video.id}/0.jpg`,
        duration: video.duration || 0,
        url: video.url || video.webpage_url || `https://www.youtube.com/watch?v=${video.id}`,
      }));

    if (results.length > 0) {
      const ranked = rankTracks(query, results, {
        limit: 1,
        minDuration: 30,
        maxDuration: 720,
        preferOriginals: true,
      });
      return ranked[0] || results[0] || null;
    }
  } catch (err) {
    console.error(`❌ yt-dlp search failed for "${query}":`, (err as any)?.message || err);
  }

  return null;
}

// ── POST /api/music/import-playlist ─────────────────────────────────
router.post('/import-playlist', async (req, res) => {
  const { url } = req.body;
  
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Please provide a playlist URL.' });
  }

  const provider = detectProvider(url.trim());
  if (!provider) {
    return res.status(400).json({ error: 'Invalid URL. Please provide a Spotify or YouTube playlist link.' });
  }

  try {
    let playlistName: string;
    let trackQueries: string[];
    let youtubeDirectTracks: { title: string; artist: string; videoId: string }[] = [];

    if (provider === 'spotify') {
      const playlistId = extractSpotifyPlaylistId(url);
      if (!playlistId) {
        return res.status(400).json({ error: 'Could not extract Spotify playlist ID from URL.' });
      }

      console.log(`📥 Importing Spotify playlist: ${playlistId}`);
      const result = await scrapeSpotifyPlaylist(playlistId);
      playlistName = result.name;
      trackQueries = result.tracks;

      if (trackQueries.length === 0) {
        return res.status(400).json({ error: 'Could not extract tracks from this Spotify playlist. Make sure the playlist is public.' });
      }
    } else {
      const playlistId = extractYouTubePlaylistId(url);
      if (!playlistId) {
        return res.status(400).json({ error: 'Could not extract YouTube playlist ID from URL.' });
      }

      console.log(`📥 Importing YouTube playlist: ${playlistId}`);
      const result = await scrapeYouTubePlaylist(playlistId);
      playlistName = result.name;
      youtubeDirectTracks = result.tracks;
      trackQueries = result.tracks.map(t => `${t.title} ${t.artist}`);
    }

    console.log(`📋 Found ${trackQueries.length} tracks in "${playlistName}", searching...`);

    // For YouTube, we can directly use the video IDs
    const matched: MusicTrack[] = [];
    const notFound: string[] = [];

    if (provider === 'youtube' && youtubeDirectTracks.length > 0) {
      // YouTube tracks can be directly mapped (we have video IDs)
      for (const yt of youtubeDirectTracks) {
        if (yt.videoId) {
          matched.push({
            id: yt.videoId,
            title: yt.title,
            artist: yt.artist,
            thumbnail: `https://img.youtube.com/vi/${yt.videoId}/0.jpg`,
            duration: 0,
            url: `https://www.youtube.com/watch?v=${yt.videoId}`,
          });
        } else {
          notFound.push(yt.title);
        }
      }
    } else {
      // Spotify: search each track sequentially in small batches
      // Use concurrency of 2 to avoid overwhelming yt-dlp processes
      const CONCURRENCY = 2;
      for (let i = 0; i < trackQueries.length; i += CONCURRENCY) {
        const batch = trackQueries.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          batch.map(async (query) => {
            const track = await searchSingleTrack(query);
            return { query, track };
          })
        );

        for (const { query, track } of results) {
          if (track) {
            // Deduplicate by ID
            if (!matched.some(m => m.id === track.id)) {
              matched.push(track);
            }
          } else {
            notFound.push(query);
          }
        }

        // Log progress for large playlists
        if (trackQueries.length > 10) {
          const done = Math.min(i + CONCURRENCY, trackQueries.length);
          console.log(`   ⏳ Progress: ${done}/${trackQueries.length} tracks searched (${matched.length} matched)`);
        }
      }
    }

    console.log(`✓ Import complete: ${matched.length} matched, ${notFound.length} not found`);

    res.json({
      playlistName,
      provider,
      totalFound: trackQueries.length,
      matched,
      notFound,
    });
  } catch (error: any) {
    console.error('❌ Import error:', error);
    res.status(500).json({ error: error.message || 'Failed to import playlist. Please try again.' });
  }
});

export default router;
