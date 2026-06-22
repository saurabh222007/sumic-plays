export type TrackVersion = 'official' | 'topic' | 'lyrics' | 'alternative' | 'modified' | 'unknown';
export type TrackQuality = 'official' | 'topic' | 'user' | 'unknown';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  url: string;
  rawTitle?: string;
  version?: TrackVersion;
  quality?: TrackQuality;
  rankScore?: number;
}

interface RankOptions {
  limit?: number;
  minDuration?: number;
  maxDuration?: number;
  preferOriginals?: boolean;
}

const MODIFIED_TOKENS = [
  'slowed',
  'reverb',
  'nightcore',
  'bass boosted',
  '8d audio',
  '1 hour',
  'one hour',
  'loop',
  'extended mix',
  'ultra bass',
  'sped up',
  'pitch shifted',
];

const LYRICS_TOKENS = ['lyrics', 'lyric video', 'with lyrics'];
const ALTERNATIVE_TOKENS = ['acoustic', 'live', 'cover', 'remix', 'remastered', 'instrumental', 'karaoke'];
const OFFICIAL_TOKENS = ['official audio', 'official video', 'official music video', 'artist upload', 'verified artist'];
const TOPIC_TOKENS = ['topic', 'auto-generated'];
const CLEAN_BRACKET_TOKENS = [
  'official audio',
  'official video',
  'official music video',
  'lyrics',
  'lyric video',
  'hd',
  '4k',
  'visualizer',
  'audio',
  'hq',
  'slowed',
  'reverb',
  'nightcore',
  'bass boosted',
  '8d audio',
  '1 hour',
  'loop',
  'remix',
  'acoustic',
  'live',
  'cover',
];

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanMusicTitle(title: string): string {
  let cleaned = title.trim();

  cleaned = cleaned.replace(/\s*[\(\[][^\)\]]{0,120}[\)\]]/g, (match) => {
    return CLEAN_BRACKET_TOKENS.some((token) => normalizeText(match).includes(token)) ? '' : match;
  });

  for (const token of CLEAN_BRACKET_TOKENS) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '');
  }

  cleaned = cleaned
    .replace(/\s*-\s*(lyrics?|lyric video|official audio|official video|official music video)\s*$/i, '')
    .replace(/\s*[\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+$/g, '')
    .trim();

  return cleaned || title.trim() || 'Unknown Title';
}

export function hasAnyToken(value: string, tokens: string[]): boolean {
  const normalized = normalizeText(value);
  return tokens.some((token) => normalized.includes(normalizeText(token)));
}

export function classifyTrackVersion(title: string, artist = ''): TrackVersion {
  const text = `${title} ${artist}`;
  if (hasAnyToken(text, MODIFIED_TOKENS)) return 'modified';
  if (hasAnyToken(text, LYRICS_TOKENS)) return 'lyrics';
  if (hasAnyToken(text, ALTERNATIVE_TOKENS)) return 'alternative';
  if (hasAnyToken(text, OFFICIAL_TOKENS)) return 'official';
  if (hasAnyToken(text, TOPIC_TOKENS)) return 'topic';
  return 'unknown';
}

export function classifyTrackQuality(title: string, artist = ''): TrackQuality {
  const text = `${title} ${artist}`;
  if (hasAnyToken(text, OFFICIAL_TOKENS) || /verified/i.test(text)) return 'official';
  if (hasAnyToken(text, TOPIC_TOKENS)) return 'topic';
  return /official|universal|sony|warner|atlantic|republic|interscope|columbia|capitol/i.test(text) ? 'official' : 'user';
}

export function normalizeTrack(track: any): MusicTrack {
  const rawTitle = String(track.title || track.name || 'Unknown Title').trim();
  const cleaned = cleanMusicTitle(rawTitle);
  const artist = String(track.artist || track.author || track.uploader || track.channel || 'Unknown Artist').trim();
  const normalized: MusicTrack = {
    id: String(track.id || track.videoId || ''),
    title: cleaned,
    artist,
    thumbnail: String(track.thumbnail || track.videoThumbnails?.[4]?.url || track.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${track.videoId || track.id || ''}/0.jpg`),
    duration: Number(track.duration || track.lengthSeconds || 0) || 0,
    url: String(track.url || track.webpage_url || `https://www.youtube.com/watch?v=${track.videoId || track.id || ''}`),
  };

  if (rawTitle !== cleaned) normalized.rawTitle = rawTitle;
  normalized.version = classifyTrackVersion(rawTitle, artist);
  normalized.quality = classifyTrackQuality(rawTitle, artist);

  return normalized;
}

export function isOriginalVersion(track: Pick<MusicTrack, 'version' | 'duration'>): boolean {
  return track.version !== 'modified' && track.version !== 'lyrics' && track.version !== 'alternative' && track.duration >= 60 && track.duration <= 720;
}

export function isModifiedVersion(track: Pick<MusicTrack, 'version' | 'duration'>): boolean {
  return track.version === 'modified' || track.duration > 720;
}

export function isLyricsVersion(track: Pick<MusicTrack, 'version'>): boolean {
  return track.version === 'lyrics';
}

export function isOfficialUpload(track: Pick<MusicTrack, 'version' | 'quality'>): boolean {
  return track.version === 'official' || track.quality === 'official';
}

export function isTopicUpload(track: Pick<MusicTrack, 'version' | 'quality'>): boolean {
  return track.version === 'topic' || track.quality === 'topic';
}

export function scoreTrack(query: string, track: MusicTrack): number {
  const normalizedQuery = normalizeText(query);
  const queryTokens = normalizedQuery.split(' ').filter((token) => token.length > 2);
  const titleText = normalizeText(track.title);
  const rawText = normalizeText(track.rawTitle || track.title);
  const artistText = normalizeText(track.artist);
  const combinedText = normalizeText(`${track.title} ${track.artist}`);
  let score = 0;

  if (normalizedQuery && titleText === normalizedQuery) score += 120;
  else if (normalizedQuery && rawText === normalizedQuery) score += 100;
  else if (normalizedQuery && titleText.includes(normalizedQuery)) score += 75;
  else if (normalizedQuery && normalizedQuery.includes(titleText) && titleText.length >= 4) score += 55;

  for (const token of queryTokens) {
    if (titleText.includes(token)) score += 12;
    if (artistText.includes(token)) score += 8;
  }

  if (track.version === 'official') score += 55;
  else if (track.version === 'topic') score += 40;
  else if (track.version === 'lyrics') score -= 35;
  else if (track.version === 'alternative') score -= 18;
  else if (track.version === 'modified') score -= 90;

  if (track.quality === 'official') score += 20;
  else if (track.quality === 'topic') score += 12;

  if (track.duration >= 150 && track.duration <= 330) score += 30;
  else if (track.duration >= 120 && track.duration <= 420) score += 20;
  else if (track.duration > 720) score -= 80;
  else if (track.duration > 600) score -= 35;
  else if (track.duration < 60) score -= 45;

  if (/topic|auto-generated/i.test(track.artist)) score += 10;
  if (/verified/i.test(track.artist)) score += 18;
  if (rawText.length > 90) score -= 18;
  if (hasAnyToken(rawText, MODIFIED_TOKENS) && !normalizedQuery.includes('slowed') && !normalizedQuery.includes('reverb') && !normalizedQuery.includes('remix')) score -= 45;
  if (hasAnyToken(rawText, LYRICS_TOKENS) && !normalizedQuery.includes('lyrics')) score -= 25;
  if (combinedText.includes(normalizeText(track.artist)) && queryTokens.some((token) => artistText.includes(token))) score += 12;

  return score;
}

export function rankTracks(query: string, tracks: any[], options: RankOptions = {}): MusicTrack[] {
  const limit = options.limit || 20;
  const minDuration = options.minDuration ?? 60;
  const maxDuration = options.maxDuration ?? 720;
  const seen = new Set<string>();
  const ranked = tracks
    .map(normalizeTrack)
    .filter((track) => track.id && track.duration >= minDuration && track.duration <= maxDuration)
    .map((track) => ({ ...track, rankScore: scoreTrack(query, track) }))
    .sort((a, b) => {
      if (options.preferOriginals) {
        const originalDelta = Number(isOriginalVersion(b)) - Number(isOriginalVersion(a));
        if (originalDelta !== 0) return originalDelta;
      }
      return (b.rankScore || 0) - (a.rankScore || 0) || a.duration - b.duration;
    });

  const deduped: MusicTrack[] = [];
  for (const track of ranked) {
    const key = `${normalizeText(track.title)}|${normalizeText(track.artist)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(track);
    if (deduped.length >= limit) break;
  }

  return deduped;
}

export function rankTrendingTracks(tracks: any[], limit = 12): MusicTrack[] {
  const normalized = tracks.map(normalizeTrack).filter((track) => track.id && track.duration >= 60 && track.duration <= 600);
  const byTitle = new Map<string, MusicTrack[]>();

  for (const track of normalized) {
    const key = `${normalizeText(track.title)}|${normalizeText(track.artist)}`;
    const bucket = byTitle.get(key) || [];
    bucket.push(track);
    byTitle.set(key, bucket);
  }

  const originals: MusicTrack[] = [];
  const fallbacks: MusicTrack[] = [];

  for (const bucket of byTitle.values()) {
    const original = bucket.find((track) => isOriginalVersion(track) && isOfficialUpload(track));
    const best = [...bucket].sort((a, b) => scoreTrack('top hits', b) - scoreTrack('top hits', a))[0];
    if (original) originals.push(original);
    else if (best) fallbacks.push(best);
  }

  return [...originals, ...fallbacks]
    .sort((a, b) => scoreTrack('top hits', b) - scoreTrack('top hits', a))
    .slice(0, limit);
}

export function recommendationQueries(track: MusicTrack): string[] {
  const artist = track.artist || 'Unknown Artist';
  const title = track.title || 'Unknown Title';
  return [
    `${artist} top songs`,
    `${artist} official audio`,
    `${artist} greatest hits`,
    `songs like ${title}`,
    `${title} ${artist} official audio`,
  ];
}

export function trendingQueries(): string[] {
  return [
    'global top 50 songs 2026 official audio',
    'top hits 2026 official music video',
    'billboard hot 100 2026 official audio',
    'popular songs 2026 official audio',
  ];
}
