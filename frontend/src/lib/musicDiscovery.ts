import type { Track } from '../store/usePlayerStore';
import { API_URL } from '../config';

export type TrackVersion = 'official' | 'topic' | 'lyrics' | 'alternative' | 'modified' | 'unknown';

export interface SearchSections {
  topResult: Track | null;
  songs: Track[];
  relatedSongs: Track[];
  sameArtistSongs: Track[];
  alternativeVersions: Track[];
  allTracks: Track[];
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

  cleaned = cleaned.replace(/\s*\([^)]{0,120}\)/g, (match) => {
    return CLEAN_BRACKET_TOKENS.some((token) => normalizeText(match).includes(token)) ? '' : match;
  });
  cleaned = cleaned.replace(/\s*\[[^\]]{0,120}\]/g, (match) => {
    return CLEAN_BRACKET_TOKENS.some((token) => normalizeText(match).includes(token)) ? '' : match;
  });

  for (const token of CLEAN_BRACKET_TOKENS) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '');
  }

  cleaned = cleaned
    .replace(/\s*-\s*(lyrics?|lyric video|official audio|official video|official music video)\s*$/i, '')
    .replace(/\s*\(/g, ' ')
    .replace(/\s*\)/g, ' ')
    .replace(/\s*\[/g, ' ')
    .replace(/\s*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+$/g, '')
    .trim();

  return cleaned || title.trim() || 'Unknown Title';
}

export function getTrackTitle(track: Pick<Track, 'title'>): string {
  return cleanMusicTitle(track.title);
}

function hasAnyToken(value: string, tokens: string[]): boolean {
  const normalized = normalizeText(value);
  return tokens.some((token) => normalized.includes(normalizeText(token)));
}

export function classifyTrackVersion(track: Track): TrackVersion {
  const text = `${track.title} ${track.artist}`;
  if (hasAnyToken(text, MODIFIED_TOKENS) || (track.duration || 0) > 720) return 'modified';
  if (hasAnyToken(text, LYRICS_TOKENS)) return 'lyrics';
  if (hasAnyToken(text, ALTERNATIVE_TOKENS)) return 'alternative';
  if (hasAnyToken(text, OFFICIAL_TOKENS)) return 'official';
  if (hasAnyToken(text, TOPIC_TOKENS)) return 'topic';
  return 'unknown';
}

export function isOriginalVersion(track: Track): boolean {
  return classifyTrackVersion(track) !== 'modified' && classifyTrackVersion(track) !== 'lyrics' && classifyTrackVersion(track) !== 'alternative' && (track.duration || 0) >= 60 && (track.duration || 0) <= 720;
}

export function isModifiedVersion(track: Track): boolean {
  return classifyTrackVersion(track) === 'modified' || (track.duration || 0) > 720;
}

export function isLyricsVersion(track: Track): boolean {
  return classifyTrackVersion(track) === 'lyrics';
}

export function isOfficialUpload(track: Track): boolean {
  const text = `${track.title} ${track.artist}`;
  return hasAnyToken(text, OFFICIAL_TOKENS) || /verified/i.test(text);
}

function scoreTrack(query: string, track: Track): number {
  const normalizedQuery = normalizeText(query);
  const queryTokens = normalizedQuery.split(' ').filter((token) => token.length > 2);
  const titleText = normalizeText(getTrackTitle(track));
  const rawText = normalizeText(track.title);
  const artistText = normalizeText(track.artist);
  const version = classifyTrackVersion(track);
  const duration = track.duration || 0;
  let score = 0;

  if (normalizedQuery && titleText === normalizedQuery) score += 120;
  else if (normalizedQuery && rawText === normalizedQuery) score += 100;
  else if (normalizedQuery && titleText.includes(normalizedQuery)) score += 75;
  else if (normalizedQuery && normalizedQuery.includes(titleText) && titleText.length >= 4) score += 55;

  for (const token of queryTokens) {
    if (titleText.includes(token)) score += 12;
    if (artistText.includes(token)) score += 8;
  }

  if (version === 'official') score += 55;
  else if (version === 'topic') score += 40;
  else if (version === 'lyrics') score -= 35;
  else if (version === 'alternative') score -= 18;
  else if (version === 'modified') score -= 90;

  if (isOfficialUpload(track)) score += 20;
  if (duration >= 150 && duration <= 330) score += 30;
  else if (duration >= 120 && duration <= 420) score += 20;
  else if (duration > 720) score -= 80;
  else if (duration > 600) score -= 35;
  else if (duration < 60) score -= 45;

  if (/topic|auto-generated/i.test(track.artist)) score += 10;
  if (/verified/i.test(track.artist)) score += 18;
  if (track.title.length > 90) score -= 18;
  if (hasAnyToken(track.title, MODIFIED_TOKENS) && !normalizedQuery.includes('slowed') && !normalizedQuery.includes('reverb') && !normalizedQuery.includes('remix')) score -= 45;
  if (hasAnyToken(track.title, LYRICS_TOKENS) && !normalizedQuery.includes('lyrics')) score -= 25;

  const cleanArtist = track.artist.toLowerCase().replace(/vevo/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  if (cleanArtist.length >= 3 && normalizeText(track.title).includes(cleanArtist)) {
    score += 30;
  }
  if (/vevo|topic|official/i.test(track.artist)) {
    score += 20;
  }

  return score;
}

export function rankTracks(query: string, tracks: Track[], options: { limit?: number; minDuration?: number; maxDuration?: number; preferOriginals?: boolean } = {}): Track[] {
  const limit = options.limit || tracks.length;
  const minDuration = options.minDuration ?? 60;
  const maxDuration = options.maxDuration ?? 720;
  const seen = new Set<string>();
  const ranked = tracks
    .map((track) => ({ ...track, title: getTrackTitle(track) }))
    .filter((track) => track.id && (track.duration || 0) >= minDuration && (track.duration || 0) <= maxDuration)
    .sort((a, b) => {
      if (options.preferOriginals) {
        const originalDelta = Number(isOriginalVersion(b)) - Number(isOriginalVersion(a));
        if (originalDelta !== 0) return originalDelta;
      }
      return scoreTrack(query, b) - scoreTrack(query, a) || (a.duration || 0) - (b.duration || 0);
    });

  const deduped: Track[] = [];
  for (const track of ranked) {
    const key = `${normalizeText(getTrackTitle(track))}|${normalizeText(track.artist)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(track);
    if (deduped.length >= limit) break;
  }

  return deduped;
}

export function dedupeTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  return tracks.filter((track) => {
    const key = track.id || `${normalizeText(getTrackTitle(track))}|${normalizeText(track.artist)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildDiscoveryQueries(query: string, topTrack: Track | null): string[] {
  const artist = topTrack?.artist || query;
  const title = topTrack ? getTrackTitle(topTrack) : query;
  return [
    `${artist} top songs`,
    `${artist} official audio`,
    `${artist} greatest hits`,
    `songs like ${title}`,
  ];
}

export function buildSearchSections(query: string, tracks: Track[], relatedTracks: Track[] = []): SearchSections {
  // Combine all tracks into a pool
  const allPool = dedupeTracks([...tracks, ...relatedTracks]);

  // Rank pool based on query
  const ranked = rankTracks(query, allPool, { limit: 80, minDuration: 45, maxDuration: 720, preferOriginals: true });

  // Find top result
  const topResult = ranked.find((track) => isOriginalVersion(track)) || ranked[0] || null;

  let sameArtistSongs: Track[] = [];
  let relatedSongs: Track[] = [];
  let songs: Track[] = [];
  let alternativeVersions: Track[] = [];

  if (topResult) {
    // Extract the primary artist name (e.g. before "ft", "feat", ",", "&", etc.)
    const primaryArtist = topResult.artist.split(/\b(ft\.?|feat\.?|and|with|vs|&|,)\b/i)[0].trim().toLowerCase();

    const topTitleClean = normalizeText(getTrackTitle(topResult));
    // Get query title keywords (excluding short words)
    const queryKeywords = normalizeText(query).split(' ').filter(w => w.length > 2);

    // Helper to check if a track is by the same artist
    const isSameArtist = (track: Track) => {
      const trackArtistNorm = track.artist.toLowerCase();
      return trackArtistNorm.includes(primaryArtist) || primaryArtist.includes(trackArtistNorm);
    };

    // Helper to check if title is a version of the topResult title or matches key query words
    const isRelatedVersionOfSong = (track: Track) => {
      const trackTitleNorm = normalizeText(getTrackTitle(track));
      // It matches if title contains the clean top result title or vice versa
      if (trackTitleNorm.includes(topTitleClean) || topTitleClean.includes(trackTitleNorm)) return true;
      // Or if it contains all key query words (if query was specified)
      if (queryKeywords.length > 0 && queryKeywords.every(word => trackTitleNorm.includes(word))) return true;
      return false;
    };

    // 1. Same Artist Songs (excluding topResult itself)
    sameArtistSongs = ranked
      .filter((track) => track.id !== topResult.id && isSameArtist(track) && isOriginalVersion(track))
      .slice(0, 8);

    // 2. Related Versions of the song by OTHER artists (covers, remixes, or other artists singing it)
    relatedSongs = ranked
      .filter((track) => track.id !== topResult.id && !isSameArtist(track) && isRelatedVersionOfSong(track))
      .slice(0, 8);

    // 3. Other Songs (not by same artist, and not related version, but original versions)
    songs = ranked
      .filter((track) => track.id !== topResult.id && !isSameArtist(track) && !isRelatedVersionOfSong(track) && isOriginalVersion(track))
      .slice(0, 10);

    // 4. Alternative Versions (slowed, reverb, lyrics, etc. that aren't already grouped above)
    alternativeVersions = ranked
      .filter((track) => track.id !== topResult.id && !isOriginalVersion(track))
      .filter((track) => !relatedSongs.some(rs => rs.id === track.id) && !sameArtistSongs.some(sa => sa.id === track.id))
      .slice(0, 8);
  } else {
    // Fallback if no top result
    songs = ranked.filter(isOriginalVersion).slice(0, 15);
    alternativeVersions = ranked.filter(t => !isOriginalVersion(t)).slice(0, 10);
  }

  // Deduplicate all tracks for playback queue
  const allTracks = dedupeTracks([
    ...(topResult ? [topResult] : []),
    ...songs,
    ...sameArtistSongs,
    ...relatedSongs,
    ...alternativeVersions,
  ]);

  return {
    topResult,
    songs,
    relatedSongs,
    sameArtistSongs,
    alternativeVersions,
    allTracks,
  };
}

export async function fetchRecommendations(track: Track, recentTracks: Track[] = []): Promise<Track[]> {
  const recentIds = recentTracks.slice(0, 20).map((recent) => recent.id).join(',');
  const params = new URLSearchParams({
    artist: track.artist,
    title: getTrackTitle(track),
    recentIds,
  });

  if (track.id) params.set('trackId', track.id);
  if (track.thumbnail) params.set('thumbnail', track.thumbnail);
  if (track.duration) params.set('duration', String(track.duration));
  if (track.url) params.set('url', track.url);

  const res = await fetch(`${API_URL}/api/music/recommendations?${params.toString()}`, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data.map((item: Track) => ({ ...item, title: getTrackTitle(item) })) : [];
}
