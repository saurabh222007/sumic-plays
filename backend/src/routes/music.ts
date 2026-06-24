import { Router } from 'express';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { rankTracks, rankTrendingTracks, recommendationQueries, trendingQueries } from '../lib/musicRanking';
import type { MusicTrack } from '../lib/musicRanking';

const execPromise = util.promisify(exec);
const router = Router();

// In-memory cache maps
const searchCache = new Map<string, { data: any; expiry: number }>();
const streamCache = new Map<string, { data: any; expiry: number }>();
const rateLimitMap = new Map<string, { tokens: number; last: number }>();

const CACHE_TTL_SEARCH = 30 * 60 * 1000; // 30 minutes
const CACHE_TTL_STREAM = 60 * 60 * 1000; // 1 hour

// Invidious public instances (fallback chain) — kept empty after audit
const INVIDIOUS_INSTANCES: string[] = [];

// Piped public instances (preferred for search/trending)
// Audited: these instances responded reliably in quick tests
const PIPED_INSTANCES = [
  'https://piped.video',
  'https://piped.kavin.rocks',
];

// Fast timeout for Invidious with fallback
async function invidiousSearch(query: string): Promise<any[]> {
  for (const instance of INVIDIOUS_INSTANCES) {
    const start = Date.now();
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`;
      const { data } = await axios.get(url, { timeout: 2500 });
      const elapsed = Date.now() - start;
      if (Array.isArray(data) && data.length > 0) {
        console.log(`✓ Invidious search succeeded via ${instance} (${elapsed}ms)`);
        return data;
      }
      console.log(`⚠ Invidious ${instance} returned empty result (${elapsed}ms)`);
    } catch (err: any) {
      const elapsed = Date.now() - start;
      console.log(`⚠ Invidious instance ${instance} failed (${elapsed}ms):`, err && err.message);
      continue;
    }
  }
  console.log('⚠ All Invidious instances failed');
  return [];
}

// Try Piped instances first (preferred)
async function pipedSearch(query: string): Promise<any[]> {
  for (const instance of PIPED_INSTANCES) {
    const start = Date.now();
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
      const { data } = await axios.get(url, { timeout: 4000 });
      const elapsed = Date.now() - start;
      if (data && Array.isArray(data) && data.length > 0) {
        console.log(`✓ Piped search succeeded via ${instance} (${elapsed}ms)`);
        return data;
      }
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        console.log(`✓ Piped (items) search succeeded via ${instance} (${elapsed}ms)`);
        return data.items;
      }
      console.log(`⚠ Piped ${instance} returned empty result (${elapsed}ms)`);
    } catch (err: any) {
      const elapsed = Date.now() - start;
      console.log(`⚠ Piped instance ${instance} failed (${elapsed}ms):`, err && err.message);
      continue;
    }
  }
  console.log('⚠ All Piped instances failed');
  return [];
}

async function getYtDlpBinary() {
  // Try platform-appropriate binary names and common locations
  const base = path.resolve(__dirname, '../../node_modules/youtube-dl-exec/bin');
  const candidates = [
    path.join(base, 'yt-dlp'),
    path.join(base, 'yt-dlp.exe'),
    path.join(base, 'yt-dlp.cmd'),
  ];

  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        console.log(`✓ Found yt-dlp binary at: ${c}`);
        return c;
      }
    } catch (e) {
      // ignore
    }
  }

  // Fallback to original path (may fail on non-Windows)
  const fallback = path.join(base, 'yt-dlp.exe');
  console.warn(`⚠ yt-dlp binary not found in expected locations, falling back to: ${fallback}`);
  return fallback;
}

// Safe runner: try programmatic API first, fall back to CLI exec
async function runYtDlpSearch(query: string, cliCmd?: string): Promise<{ stdout: string; source: string }> {
  // Attempt programmatic API
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ytdl = require('youtube-dl-exec');
    if (typeof ytdl === 'function') {
      console.log('▶ Using programmatic youtube-dl-exec API for search');
      try {
        const out = await ytdl(`ytsearch10:${query}`, {
          dumpJson: true,
          flatPlaylist: true,
          noPlaylist: true,
          ignoreErrors: true,
          noWarnings: true,
        });
        // The API may return a string or object
        if (typeof out === 'string') return { stdout: out, source: 'programmatic' };
        if ((out as any)?.stdout) return { stdout: (out as any).stdout, source: 'programmatic' };
        return { stdout: JSON.stringify(out), source: 'programmatic' };
      } catch (apiErr) {
        console.warn('⚠ programmatic youtube-dl-exec failed:', (apiErr as any)?.message || apiErr);
        // fall through to CLI fallback
      }
    }
  } catch (e) {
    // module not available or require failed — will use CLI fallback
    console.log('⚠ youtube-dl-exec programmatic API not available, falling back to CLI');
  }

  // CLI fallback
  try {
    const binary = await getYtDlpBinary();
    const cmd = cliCmd || `"${binary}" "ytsearch10:${query}" --dump-json --no-playlist --ignore-errors --no-warnings --flat-playlist`;
    console.log(`▶ Falling back to CLI: ${cmd}`);
    const { stdout } = await execPromise(cmd, { maxBuffer: 1024 * 1024 * 10, timeout: 8000 });
    return { stdout: String(stdout || ''), source: 'cli' };
  } catch (cliErr: any) {
    console.error('❌ yt-dlp fallback exec error (search):', cliErr && cliErr.message);
    if (cliErr && typeof cliErr.stdout !== 'undefined') console.error('--- stdout:', String(cliErr.stdout).slice(0, 2000));
    if (cliErr && typeof cliErr.stderr !== 'undefined') console.error('--- stderr:', String(cliErr.stderr).slice(0, 2000));
    return { stdout: '', source: 'error' };
  }
}

function queryString(value: unknown): string {
  if (Array.isArray(value)) return value[0] || '';
  return value == null ? '' : String(value);
}

async function executeSearch(query: string): Promise<any[]> {
  // 1) Try Piped (preferred)
  const piped = await pipedSearch(query);
  if (piped.length > 0) {
    // Map Piped/Invidious-like items into unified shape
    return piped
      .filter((v: any) => !!(v.videoId || v.id || v.identifier || v.video?.videoId))
      .map((video: any) => {
        const vid = video.videoId || video.id || video.identifier || (video.video && video.video.videoId) || '';
        return {
          id: vid,
          videoId: vid,
          title: video.title || video.name || (video.video && video.video.title) || 'Unknown Title',
          artist: video.author || video.uploader || video.channel || 'Unknown Artist',
          thumbnail: video.videoThumbnails?.[4]?.url || video.videoThumbnails?.[0]?.url || video.thumbnail || `https://img.youtube.com/vi/${vid}/0.jpg`,
          duration: video.lengthSeconds || video.duration || 0,
          url: `https://www.youtube.com/watch?v=${vid}`,
          viewCount: video.views || video.viewCount || video.shortViewCount || video.viewCountText,
          likeCount: video.likes || video.likeCount,
        };
      });

  }

  // 2) Try Invidious
  const invResults = await invidiousSearch(query);
  if (invResults.length > 0) {
    return invResults
      .filter((v: any) => v.type === 'video')
      .map((video: any) => ({
        id: video.videoId,
        videoId: video.videoId,
        title: video.title,
        artist: video.author || 'Unknown Artist',
        thumbnail: video.videoThumbnails?.[4]?.url || video.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${video.videoId}/0.jpg`,
        duration: video.lengthSeconds || 0,
        url: `https://www.youtube.com/watch?v=${video.videoId}`,
        viewCount: video.viewCount || video.views || video.shortViewCount || video.viewCountText,
        likeCount: video.likeCount || video.likes,
      }));
  }

  // 3) Fallback to programmatic lightweight search (ytsr) when Piped/Invidious unavailable
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const debugYtsr = process.env.DEBUG_YTSR === 'true';
    const ytsrRequire = () => require('ytsr');
    const origError = console.error;
    const origWarn = console.warn;
    const origStderrWrite = process.stderr.write;
    if (!debugYtsr) {
      console.error = () => {};
      console.warn = () => {};
      process.stderr.write = () => true as any;
    }
    try {
      const ytsr = ytsrRequire();
      const start = Date.now();
      const r = await ytsr(query, { limit: 20 });
      const elapsed = Date.now() - start;
      if (r && Array.isArray(r.items) && r.items.length > 0) {
        if (debugYtsr) console.log(`✓ ytsr fallback succeeded (${elapsed}ms)`);
        return r.items
          .filter((it: any) => it.type === 'video')
          .map((video: any) => ({
            id: video.id || video.videoId || '',
            videoId: video.id || video.videoId || '',
            title: video.title || 'Unknown Title',
            artist: (video.author && video.author.name) || video.uploader || 'Unknown Artist',
            thumbnail: (video.thumbnails && video.thumbnails[0] && video.thumbnails[0].url) || `https://img.youtube.com/vi/${video.id}/0.jpg`,
            duration: (function parseDur(d:any){ if(!d) return 0; if(typeof d==='number') return d; if(typeof d==='string'){ const parts=d.split(':').map(Number).reverse(); let s=0; for(let i=0;i<parts.length;i++){ s += (parts[i]||0)*Math.pow(60,i); } return s;} return 0;})(video.duration),
            url: video.url || `https://www.youtube.com/watch?v=${video.id}`,
            viewCount: video.views || video.viewCount || video.shortViewCount || video.shortViewCountText,
          }));
      }
    } finally {
      // restore console
      console.error = origError;
      console.warn = origWarn;
      process.stderr.write = origStderrWrite;
    }
  } catch (yErr) {
    // ytsr not available or failed — will try yt-dlp only if explicitly enabled
    console.log('⚠ ytsr fallback unavailable or failed');
    if (process.env.DEBUG_YTSR === 'true') console.error(yErr);
  }

  // 4) Fallback to yt-dlp ONLY if explicitly enabled via env
  if (process.env.ENABLE_YTDLP === 'true') {
    try {
      console.log(`🔄 yt-dlp search fallback for: ${query}`);
      const binary = await getYtDlpBinary();
      const cmd = `"${binary}" "ytsearch10:${query}" --dump-json --no-playlist --ignore-errors --no-warnings --flat-playlist`;
      console.log(`▶ Executing command: ${cmd}`);

      try {
        const result = await runYtDlpSearch(query, cmd);
        console.log(`--- yt-dlp stdout (search) length: ${String(result.stdout).length}; source=${result.source}`);

        return String(result.stdout)
          .split('\n')
          .map((line: string) => line.trim())
          .filter(Boolean)
          .map((line: string) => {
            try { return JSON.parse(line); } catch (e) { console.warn('⚠ Failed to parse yt-dlp JSON line:', e); return null; }
          })
          .filter(Boolean)
          .map((video: any) => ({
            id: video.id || video.videoId || (video.url && String(video.url).split('v=')[1]) || '',
            videoId: video.id || video.videoId || (video.url && String(video.url).split('v=')[1]) || '',
            title: video.title || video.name || 'Unknown Title',
            artist: video.uploader || video.channel || video.artist || 'Unknown Artist',
            thumbnail: video.thumbnails?.[0]?.url || video.thumbnail || `https://img.youtube.com/vi/${video.id}/0.jpg`,
            duration: video.duration || video.lengthSeconds || 0,
            url: video.url || video.webpage_url || `https://www.youtube.com/watch?v=${video.id}`,
            viewCount: video.view_count || video.viewCount || video.views,
            likeCount: video.like_count || video.likeCount || video.likes,
          }));
      } catch (execErr: any) {
        console.error('❌ yt-dlp fallback exec error:', execErr && execErr.message);
        if (execErr && typeof execErr.stdout !== 'undefined') console.error('--- stdout:', String(execErr.stdout).slice(0, 2000));
        if (execErr && typeof execErr.stderr !== 'undefined') console.error('--- stderr:', String(execErr.stderr).slice(0, 2000));
        return [];
      }
    } catch (err) {
      console.error('❌ yt-dlp fallback error (outer):', err);
      return [];
    }
  }

  console.log('⚠ No search providers produced results and ENABLE_YTDLP!=true');
  return [];
}

async function fetchRankedSearch(query: string, limit = 12): Promise<MusicTrack[]> {
  const mapped = await executeSearch(query);
  const ranked = rankTracks(query, mapped, {
    limit,
    minDuration: 30,
    maxDuration: 600,
    preferOriginals: true,
  });
  return ranked;
}

function headerValue(value: unknown): string {
  if (Array.isArray(value)) return value[0] || '';
  return value == null ? '' : String(value);
}

router.get('/search', async (req, res) => {
  const query = (req.query.q as string || '').trim();
  if (!query) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  // Token-bucket rate limiting per IP to allow short bursts (capacity 60, refill 1 token/sec)
  try {
    const ip = String(req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
    const key = `rl:${ip}`;
    const now = Date.now();
    const refillPerSec = 1; // 60 tokens per minute
    const capacity = 60;
    let entry = rateLimitMap.get(key) as any;
    if (!entry) {
      entry = { tokens: capacity - 1, last: now };
      rateLimitMap.set(key, entry);
    } else {
      const elapsed = Math.max(0, now - entry.last);
      const add = Math.floor(elapsed / 1000 * refillPerSec);
      entry.tokens = Math.min(capacity, (entry.tokens || 0) + add);
      entry.last = now;
      if ((entry.tokens || 0) <= 0) {
        const waitSec = Math.ceil((1 - (entry.tokens || 0)) / refillPerSec);
        res.setHeader('Retry-After', String(waitSec));
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      entry.tokens = (entry.tokens || 0) - 1;
      rateLimitMap.set(key, entry);
    }
  } catch (e) {
    // ignore rate limit errors
  }

  // Check cache first
  const cached = searchCache.get(query);
  if (cached && cached.expiry > Date.now()) {
    console.log(`✓ Cache hit for: ${query}`);
    return res.json(cached.data);
  }

  try {
    const results = await executeSearch(query);
    const rankedResults = rankTracks(query, results, {
      limit: 20,
      minDuration: 30,
      maxDuration: 720,
      preferOriginals: true,
    });

    // Cache results
    searchCache.set(query, {
      data: rankedResults,
      expiry: Date.now() + CACHE_TTL_SEARCH,
    });

    console.log(`✓ Search completed for "${query}": ${rankedResults.length} results`);
    if (!rankedResults || rankedResults.length === 0) {
      console.error(`❌ Search returned no results for "${query}"`);
      // If no backend providers available, prefer to return an error so frontend can show helpful UI
      return res.status(502).json({ error: 'Search providers unavailable' });
    }
    res.json(rankedResults);
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ error: 'Failed to search - please try again' });
  }
});

let cachedTrending: any = null;
let trendingExpiry = 0;
const CACHE_TTL_TRENDING = 60 * 60 * 1000; // 1 hour

const TRENDING_FALLBACK: MusicTrack[] = [
  {
    id: 'kPa7bsKwL-c',
    videoId: 'kPa7bsKwL-c',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    thumbnail: 'https://img.youtube.com/vi/kPa7bsKwL-c/0.jpg',
    duration: 200,
    url: 'https://www.youtube.com/watch?v=kPa7bsKwL-c',
  },
  {
    id: 'JGwWNGJdvx8',
    videoId: 'JGwWNGJdvx8',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/0.jpg',
    duration: 234,
    url: 'https://www.youtube.com/watch?v=JGwWNGJdvx8',
  },
  {
    id: 'TUVcZfQe-Kw',
    videoId: 'TUVcZfQe-Kw',
    title: 'Levitating',
    artist: 'Dua Lipa',
    thumbnail: 'https://img.youtube.com/vi/TUVcZfQe-Kw/0.jpg',
    duration: 203,
    url: 'https://www.youtube.com/watch?v=TUVcZfQe-Kw',
  },
  {
    id: 'fHI8X4OXluQ',
    videoId: 'fHI8X4OXluQ',
    title: 'As It Was',
    artist: 'Harry Styles',
    thumbnail: 'https://img.youtube.com/vi/fHI8X4OXluQ/0.jpg',
    duration: 167,
    url: 'https://www.youtube.com/watch?v=fHI8X4OXluQ',
  },
  {
    id: 'oygrmJFKYZY',
    videoId: 'oygrmJFKYZY',
    title: 'Flowers',
    artist: 'Miley Cyrus',
    thumbnail: 'https://img.youtube.com/vi/oygrmJFKYZY/0.jpg',
    duration: 200,
    url: 'https://www.youtube.com/watch?v=oygrmJFKYZY',
  },
  {
    id: 'H5v3kku4y6Q',
    videoId: 'H5v3kku4y6Q',
    title: 'Late Night Talking',
    artist: 'Harry Styles',
    thumbnail: 'https://img.youtube.com/vi/H5v3kku4y6Q/0.jpg',
    duration: 178,
    url: 'https://www.youtube.com/watch?v=H5v3kku4y6Q',
  },
];

router.get('/trending', async (_req, res) => {
  if (cachedTrending && trendingExpiry > Date.now()) {
    console.log('✓ Trending cache hit');
    return res.json(cachedTrending);
  }

  try {
    const queries = trendingQueries();
    const resultsArray = [];
    
    // Fetch sequentially to prevent concurrent yt-dlp instance load spikes
    for (const query of queries) {
      try {
        const results = await fetchRankedSearch(query, 8);
        console.log(`• Trending query "${query}" returned ${results.length} ranked results`);
        if (!Array.isArray(results) || results.length === 0) console.log(`  - No results for trending query: "${query}"`);
        resultsArray.push(results);
      } catch (err) {
        console.error(`Warning: Failed to fetch trending search for "${query}":`, err);
      }
    }
    
    const allTracks = resultsArray.flat();
    const ranked = rankTrendingTracks(allTracks, 15);

    if (ranked.length > 0) {
      cachedTrending = ranked;
      trendingExpiry = Date.now() + CACHE_TTL_TRENDING;
    }

    if (!ranked || ranked.length === 0) {
      console.error('❌ Trending aggregation produced no tracks');
      cachedTrending = TRENDING_FALLBACK;
      trendingExpiry = Date.now() + 10 * 60 * 1000;
      return res.json(TRENDING_FALLBACK);
    }

    res.json(ranked);
  } catch (error) {
    console.error('❌ Trending error:', error);
    res.status(500).json({ error: 'Failed to load trending songs' });
  }
});

router.get('/recommendations', async (req, res) => {
  const artist = queryString(req.query.artist).trim();
  const title = queryString(req.query.title).trim();
  const recentIds = new Set(queryString(req.query.recentIds).split(',').filter(Boolean));

  if (!artist || !title) {
    return res.status(400).json({ error: 'Artist and title query parameters are required' });
  }

  try {
    const current: MusicTrack = {
      id: queryString(req.query.trackId),
      title,
      artist,
      thumbnail: queryString(req.query.thumbnail),
      duration: Number(queryString(req.query.duration) || 0) || 0,
      url: queryString(req.query.url),
    };

    const queries = recommendationQueries(current);
    const resultsArray = await Promise.all(
      queries.map((query) => fetchRankedSearch(query, 8))
    );
    const allTracks = resultsArray.flat();

    const ranked = rankTracks(`${artist} ${title}`, allTracks, {
      limit: 10,
      minDuration: 60,
      maxDuration: 720,
      preferOriginals: true,
    }).filter((track) => {
      if (recentIds.has(track.id)) return false;
      if (track.id === current.id) return false;
      return true;
    });

    res.json(ranked.slice(0, 8));
  } catch (error) {
    console.error('❌ Recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

router.get('/stream/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Track ID is required' });
  }

  // By default the backend should NOT proxy/stream audio. Only allow when explicitly enabled.
  if (process.env.ENABLE_YTDLP !== 'true') {
    return res.status(403).json({ error: 'Server-side streaming disabled. Enable ENABLE_YTDLP=true to allow fallback streaming.' });
  }

  const url = `https://www.youtube.com/watch?v=${id}`;
  let lastError: any;

  // Retry with exponential backoff (3 attempts)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🔄 Fetching stream URL for: ${id} (attempt ${attempt})`);
      const binary = await getYtDlpBinary();
      
      // Add random user agent and headers to avoid rate limiting
      const randomUserAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.${Math.floor(Math.random() * 10000)}.0 Safari/537.36`;
      const cmd = `"${binary}" ${url} -f "bestaudio[ext=m4a]/bestaudio/best" --get-url --no-warnings --user-agent "${randomUserAgent}"`;
      console.log(`▶ Executing stream command: ${cmd}`);

      try {
        // For stream URL, try programmatic first then CLI fallback
        let stdout = '';
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const ytdl = require('youtube-dl-exec');
          if (typeof ytdl === 'function') {
            console.log('▶ Using programmatic youtube-dl-exec API for stream URL');
            const out = await ytdl(url, {
              getUrl: true,
              format: 'bestaudio[ext=m4a]/bestaudio/best',
              noWarnings: true,
              userAgent: randomUserAgent,
            });
            if (typeof out === 'string') stdout = out;
            else if ((out as any)?.stdout) stdout = (out as any).stdout;
            else stdout = String(out || '');
          }
        } catch (progErr) {
          console.log('⚠ programmatic youtube-dl-exec not usable for stream, falling back to CLI');
        }

        if (!stdout) {
          const binary = await getYtDlpBinary();
          const cmdStream = `"${binary}" ${url} -f "bestaudio[ext=m4a]/bestaudio/best" --get-url --no-warnings --user-agent "${randomUserAgent}"`;
          console.log(`▶ Falling back to CLI stream command: ${cmdStream}`);
          const execRes = await execPromise(cmdStream, { maxBuffer: 1024 * 1024 * 10, timeout: 20000 });
          stdout = String(execRes.stdout || '');
        }

        console.log(`--- yt-dlp stdout (stream) length: ${String(stdout).length}`);
        const streamUrl = stdout.trim();

        if (!streamUrl) {
          console.warn('⚠ yt-dlp returned empty stream URL for', id);
          throw new Error('No stream URL found in response');
        }

        console.log(`✓ Stream URL obtained for: ${id}, now proxying stream...`);

        // Proxy the stream through our server to avoid CORS issues
        try {
          const audioResponse = await axios.get(streamUrl, {
            responseType: 'stream',
            timeout: 30000,
            headers: {
              'User-Agent': randomUserAgent
            }
          });

          // Set proper response headers for audio streaming
          res.setHeader('Content-Type', headerValue(audioResponse.headers['content-type']) || 'audio/mp4');
          res.setHeader('Content-Length', headerValue(audioResponse.headers['content-length']));
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Cache-Control', 'public, max-age=3600');

          console.log(`✓ Streaming audio for: ${id}`);
          audioResponse.data.pipe(res);
          return;
        } catch (streamError: any) {
          console.error(`⚠ Failed to proxy stream for ${id}:`, streamError && streamError.message);
          throw streamError;
        }
      } catch (execErr: any) {
        console.error(`❌ yt-dlp error while fetching stream for ${id}:`, execErr && execErr.message || execErr);
        if (execErr && typeof execErr.stdout !== 'undefined') console.error('--- stdout:', String(execErr.stdout).slice(0, 2000));
        if (execErr && typeof execErr.stderr !== 'undefined') console.error('--- stderr:', String(execErr.stderr).slice(0, 2000));
        throw execErr;
      }
    } catch (error: any) {
      lastError = error;
      console.error(`⚠ Stream error for ${id} (attempt ${attempt}):`, error.message);
      
      // If it's a rate limit or network error, wait before retrying
      if (attempt < 3) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 5000);
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  console.error(`❌ Stream fetch failed after 3 attempts for ${id}:`, lastError);
  res.status(500).json({ error: 'Failed to get stream - video may be unavailable or rate limited' });
});

export default router;
