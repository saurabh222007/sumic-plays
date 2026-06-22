import { Router } from 'express';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import axios from 'axios';
import { rankTracks, rankTrendingTracks, recommendationQueries, trendingQueries } from '../lib/musicRanking';
import type { MusicTrack } from '../lib/musicRanking';

const execPromise = util.promisify(exec);
const router = Router();

// In-memory cache maps
const searchCache = new Map<string, { data: any; expiry: number }>();
const streamCache = new Map<string, { data: any; expiry: number }>();

const CACHE_TTL_SEARCH = 30 * 60 * 1000; // 30 minutes
const CACHE_TTL_STREAM = 60 * 60 * 1000; // 1 hour

// Invidious public instances (fallback chain for reliability)
const INVIDIOUS_INSTANCES = [
  'https://vid.puffyan.us',
  'https://invidious.fdn.fr',
  'https://invidious.privacyredirect.com',
  'https://inv.nadeko.net',
];

// Fast timeout for Invidious with fallback
async function invidiousSearch(query: string): Promise<any[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
  
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`;
      const { data } = await axios.get(url, { 
        timeout: 2500,
        signal: controller.signal as any
      });
      clearTimeout(timeoutId);
      if (Array.isArray(data) && data.length > 0) {
        console.log(`✓ Invidious search succeeded via ${instance}`);
        return data;
      }
    } catch (err) {
      console.log(`⚠ Invidious instance ${instance} failed:`, (err as any)?.message);
      continue;
    }
  }
  clearTimeout(timeoutId);
  console.log('⚠ All Invidious instances failed, falling back to yt-dlp');
  return [];
}

async function getYtDlpBinary() {
  return path.resolve(__dirname, '../../node_modules/youtube-dl-exec/bin/yt-dlp.exe');
}

function queryString(value: unknown): string {
  if (Array.isArray(value)) return value[0] || '';
  return value == null ? '' : String(value);
}

async function executeSearch(query: string): Promise<any[]> {
  const invResults = await invidiousSearch(query);
  if (invResults.length > 0) {
    return invResults
      .filter((v: any) => v.type === 'video')
      .map((video: any) => ({
        id: video.videoId,
        title: video.title,
        artist: video.author || 'Unknown Artist',
        thumbnail: video.videoThumbnails?.[4]?.url || video.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${video.videoId}/0.jpg`,
        duration: video.lengthSeconds || 0,
        url: `https://www.youtube.com/watch?v=${video.videoId}`,
      }));
  }

  // Fallback to yt-dlp CLI if Invidious fails
  try {
    console.log(`🔄 yt-dlp search fallback for: ${query}`);
    const binary = await getYtDlpBinary();
    const { stdout } = await execPromise(
      `"${binary}" "ytsearch10:${query}" --dump-json --no-playlist --ignore-errors --no-warnings --flat-playlist`,
      { maxBuffer: 1024 * 1024 * 10, timeout: 8000 }
    );

    return stdout
      .split('\n')
      .map((line: string) => line.trim())
      .filter(Boolean)
      .map((line: string) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean)
      .map((video: any) => ({
        id: video.id || video.videoId || (video.url && String(video.url).split('v=')[1]) || '',
        title: video.title || video.name || 'Unknown Title',
        artist: video.uploader || video.channel || video.artist || 'Unknown Artist',
        thumbnail: video.thumbnails?.[0]?.url || video.thumbnail || `https://img.youtube.com/vi/${video.id}/0.jpg`,
        duration: video.duration || video.lengthSeconds || 0,
        url: video.url || video.webpage_url || `https://www.youtube.com/watch?v=${video.id}`,
      }));
  } catch (err) {
    console.error('❌ yt-dlp fallback error:', err);
    return [];
  }
}

async function fetchRankedSearch(query: string, limit = 12): Promise<MusicTrack[]> {
  const mapped = await executeSearch(query);
  return rankTracks(query, mapped, {
    limit,
    minDuration: 60,
    maxDuration: 600,
    preferOriginals: true,
  });
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
      minDuration: 45,
      maxDuration: 720,
      preferOriginals: true,
    });

    // Cache results
    searchCache.set(query, {
      data: rankedResults,
      expiry: Date.now() + CACHE_TTL_SEARCH,
    });

    console.log(`✓ Search completed for "${query}": ${rankedResults.length} results`);
    res.json(rankedResults);
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ error: 'Failed to search - please try again' });
  }
});

let cachedTrending: any = null;
let trendingExpiry = 0;
const CACHE_TTL_TRENDING = 60 * 60 * 1000; // 1 hour

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

  const url = `https://www.youtube.com/watch?v=${id}`;
  let lastError: any;

  // Retry with exponential backoff (3 attempts)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🔄 Fetching stream URL for: ${id} (attempt ${attempt})`);
      const binary = await getYtDlpBinary();
      
      // Add random user agent and headers to avoid rate limiting
      const randomUserAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.${Math.floor(Math.random() * 10000)}.0 Safari/537.36`;
      
      const { stdout } = await execPromise(
        `"${binary}" ${url} -f "bestaudio[ext=m4a]/bestaudio/best" --get-url --no-warnings --user-agent "${randomUserAgent}"`,
        { maxBuffer: 1024 * 1024 * 10, timeout: 20000 }
      );
      
      const streamUrl = stdout.trim();

      if (!streamUrl) {
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
        console.error(`⚠ Failed to proxy stream for ${id}:`, streamError.message);
        throw streamError;
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
