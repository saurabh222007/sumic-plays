import { Router } from 'express';
import axios from 'axios';

const router = Router();

// ─── Cache ────────────────────────────────────────────────────────────────────
const lyricsCache = new Map<string, { data: any; expiry: number }>();
const CACHE_HIT_TTL  = 24 * 60 * 60 * 1000;   // 24 h for found lyrics
const CACHE_MISS_TTL =      10 * 60 * 1000;   // 10 min for "not found" to allow retry

// ─── Title normalisation ──────────────────────────────────────────────────────
const NOISE_PATTERNS = [
  /\(official\s*(music\s*)?video\)/gi,
  /\(official\s*audio\)/gi,
  /\(lyrics?\s*(video)?\)/gi,
  /\(visuali[sz]er\)/gi,
  /\(hd\s*(video)?\)/gi,
  /\(remastered\s*(\d{4})?\)/gi,
  /\(live[^)]*\)/gi,
  /\(explicit\)/gi,
  /\(feat\.?[^)]*\)/gi,
  /\[official\s*(music\s*)?video\]/gi,
  /\[official\s*audio\]/gi,
  /\[lyrics?\s*(video)?\]/gi,
  /\[visuali[sz]er\]/gi,
  /\[hd[^\]]*\]/gi,
  /\[remastered[^\]]*\]/gi,
  /\[live[^\]]*\]/gi,
  /\[explicit\]/gi,
  /\[feat\.?[^\]]*\]/gi,
  /\s*-\s*(official\s*(music\s*)?video|official\s*audio|lyrics?\s*video|hd|remastered|live\s*version)\s*$/gi,
  /\s+ft\.?\s+.+$/gi,
];

function normalizeTitle(title: string): string {
  let t = title;
  for (const pat of NOISE_PATTERNS) {
    t = t.replace(pat, '');
  }
  return t.replace(/\s{2,}/g, ' ').trim();
}

function normalizeArtist(artist: string): string {
  // Strip featured artists e.g. "The Weeknd ft. Doja Cat" → "The Weeknd"
  return artist.replace(/\s*(ft\.?|feat\.?|&|,)\s*.+$/gi, '').trim();
}

// ─── Source 1: LRCLIB ─────────────────────────────────────────────────────────
async function fetchFromLRCLIB(track: string, artist: string): Promise<any | null> {
  try {
    const params: Record<string, string> = { track_name: track };
    if (artist) params.artist_name = artist;

    const res = await axios.get('https://lrclib.net/api/search', { params, timeout: 8000 });
    if (res.data && res.data.length > 0) {
      // Prefer entries that actually have lyrics (synced or plain)
      const withLyrics = res.data.find((r: any) => r.syncedLyrics || r.plainLyrics);
      return withLyrics || res.data[0];
    }
  } catch (e) {
    // ignore, try next source
  }
  return null;
}

// ─── Source 2: Lyrics.ovh ─────────────────────────────────────────────────────
async function fetchFromLyricsOvh(track: string, artist: string): Promise<any | null> {
  if (!artist) return null;
  try {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(track)}`;
    const res = await axios.get(url, { timeout: 8000 });
    if (res.data?.lyrics && res.data.lyrics.trim().length > 10) {
      return { plainLyrics: res.data.lyrics.trim(), trackName: track, artistName: artist };
    }
  } catch (e) {
    // ignore, try next source
  }
  return null;
}

// ─── Main route ───────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { track_name, artist_name } = req.query;

  if (!track_name) {
    return res.status(400).json({ error: 'track_name is required' });
  }

  const rawTitle  = String(track_name).trim();
  const rawArtist = String(artist_name || '').trim();

  const normTitle  = normalizeTitle(rawTitle);
  const normArtist = normalizeArtist(rawArtist);

  // Cache key based on normalised values
  const cacheKey = `${normTitle.toLowerCase()}|${normArtist.toLowerCase()}`;
  const cached = lyricsCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return res.json(cached.data);
  }

  // ── Waterfall ─────────────────────────────────────────────────────────────
  let result: any = null;

  // 1) LRCLIB with normalised title + artist
  result = await fetchFromLRCLIB(normTitle, normArtist);

  // 2) LRCLIB with normalised title only (no artist filter)
  if (!result || (!result.syncedLyrics && !result.plainLyrics)) {
    result = await fetchFromLRCLIB(normTitle, '');
  }

  // 3) Lyrics.ovh
  if (!result || (!result.syncedLyrics && !result.plainLyrics)) {
    const ovhResult = await fetchFromLyricsOvh(normTitle, normArtist);
    if (ovhResult) result = ovhResult;
  }

  // 4) Try with raw (non-normalised) title as last resort on LRCLIB
  if (!result || (!result.syncedLyrics && !result.plainLyrics)) {
    result = await fetchFromLRCLIB(rawTitle, rawArtist);
  }

  if (result && (result.syncedLyrics || result.plainLyrics)) {
    lyricsCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_HIT_TTL });
    return res.json(result);
  }

  // Cache the miss with short TTL
  const missPayload = { notFound: true };
  lyricsCache.set(cacheKey, { data: missPayload, expiry: Date.now() + CACHE_MISS_TTL });
  return res.status(404).json({ error: 'Lyrics not found' });
});

export default router;
