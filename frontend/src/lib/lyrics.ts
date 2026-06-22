import { API_URL } from '../config';

export interface LyricsResult {
  plainLyrics?: string;
  syncedLyrics?: string;
  trackName?: string;
  artistName?: string;
}

const API = `${API_URL}/api`;

// ─── Noise patterns (mirrors backend normalisation) ──────────────────────────
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
  /\[hd[^\]]*\]/gi,
  /\[remastered[^\]]*\]/gi,
  /\[live[^\]]*\]/gi,
  /\[explicit\]/gi,
  /\[feat\.?[^\]]*\]/gi,
  /\s*-\s*(official\s*(music\s*)?video|official\s*audio|lyrics?\s*video|hd|remastered|live\s*version)\s*$/gi,
  /\s+ft\.?\s+.+$/gi,
];

export function normalizeTitle(title: string): string {
  let t = title;
  for (const pat of NOISE_PATTERNS) {
    t = t.replace(pat, '');
  }
  return t.replace(/\s{2,}/g, ' ').trim();
}

export function normalizeArtist(artist: string): string {
  return artist.replace(/\s*(ft\.?|feat\.?|&|,)\s*.+$/gi, '').trim();
}

// ─── Fetch with retry ─────────────────────────────────────────────────────────
async function fetchWithRetry(url: string, retries = 3, delayMs = 400): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return res; // 404 is a valid "not found" — no retry needed
      if (i < retries - 1) await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    } catch {
      if (i < retries - 1) await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  return null;
}

export async function getLyrics(title: string, artist: string): Promise<LyricsResult | null> {
  const normTitle  = normalizeTitle(title);
  const normArtist = normalizeArtist(artist);

  const params = new URLSearchParams({ track_name: normTitle, artist_name: normArtist });

  try {
    const res = await fetchWithRetry(`${API}/lyrics?${params.toString()}`);
    if (!res || !res.ok) return null;
    return (await res.json()) as LyricsResult;
  } catch {
    return null;
  }
}
