import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import type { Track } from '../store/usePlayerStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';

interface ArtistSpotlightProps {
  query: string;
  results: Track[];
}

// Simple heuristic: if most results share same artist, show spotlight
function detectArtist(query: string, results: Track[]): { name: string; tracks: Track[]; thumbnail: string } | null {
  if (results.length < 2) return null;

  // Count artist occurrences
  const artistCounts = new Map<string, number>();
  for (const t of results) {
    const artist = t.artist?.trim();
    if (artist) {
      artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
    }
  }

  // Find the most common artist
  let topArtist = '';
  let topCount = 0;
  for (const [name, count] of artistCounts) {
    if (count > topCount) {
      topArtist = name;
      topCount = count;
    }
  }

  // Only show spotlight if artist appears in at least 3 results or query looks like an artist name
  const queryLower = query.toLowerCase();
  const artistLower = topArtist.toLowerCase();
  const isArtistSearch = artistLower.includes(queryLower) || queryLower.includes(artistLower);

  if (topCount >= 3 || (topCount >= 2 && isArtistSearch)) {
    const artistTracks = results.filter(t => t.artist?.trim() === topArtist);
    return {
      name: topArtist,
      tracks: artistTracks.slice(0, 5),
      thumbnail: artistTracks[0]?.thumbnail || '',
    };
  }

  return null;
}

// Derive vibes from track titles/artist
function deriveVibes(name: string, tracks: Track[]): string[] {
  const text = `${name} ${tracks.map(t => t.title).join(' ')}`.toLowerCase();
  const vibes: string[] = [];

  if (text.match(/rap|hip.?hop|drill|gangsta/)) vibes.push('Powerful');
  if (text.match(/love|heart|romantic/)) vibes.push('Romantic');
  if (text.match(/sad|cry|pain|miss/)) vibes.push('Emotional');
  if (text.match(/party|dance|club|dj/)) vibes.push('Party');
  if (text.match(/energy|hype|beast|fire/)) vibes.push('High Energy');
  if (text.match(/chill|lofi|relax|calm/)) vibes.push('Chill');
  if (text.match(/drive|speed|fast|car/)) vibes.push('Drive');
  if (text.match(/confiden|boss|king|queen/)) vibes.push('Confident');

  if (vibes.length === 0) vibes.push('Versatile', 'Unique');
  return vibes.slice(0, 4);
}

export function ArtistSpotlight({ query, results }: ArtistSpotlightProps) {
  const artist = detectArtist(query, results);
  const { playTrack, playQueue } = usePlayerStore();
  const { addRecent } = useLibraryStore();

  if (!artist) return null;

  const vibes = deriveVibes(artist.name, artist.tracks);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mb-8 relative overflow-hidden rounded-3xl"
    >
      {/* Blurred background */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-[60px] opacity-30 scale-125"
        style={{ backgroundImage: `url(${artist.thumbnail})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-surface/90 via-surface/80 to-surface/60" />

      <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
        {/* Artist Photo */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden shrink-0 shadow-elevated border border-glass-border"
        >
          <img src={artist.thumbnail} alt={artist.name} className="w-full h-full object-cover" />
        </motion.div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Star size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Artist Spotlight</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary mb-3 truncate">{artist.name}</h2>

          {/* Vibe Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {vibes.map((v) => (
              <span key={v} className="px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold border border-primary/20">
                {v}
              </span>
            ))}
          </div>

          {/* Top Tracks */}
          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Top Tracks</h3>
            <div className="flex flex-col gap-1">
              {artist.tracks.map((track, i) => (
                <button
                  key={track.id + i}
                  onPointerDown={(e) => { e.preventDefault(); playTrack(track); addRecent(track); }}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition text-left group"
                >
                  <span className="text-xs text-text-muted w-4 text-right">{i + 1}</span>
                  <img src={track.thumbnail} alt={track.title} className="w-9 h-9 rounded-lg object-cover" />
                  <span className="text-sm font-medium text-text-primary truncate flex-1 group-hover:text-primary transition-colors">
                    {track.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Play All */}
          <button
            onClick={() => { playQueue(artist.tracks, 0); addRecent(artist.tracks[0]); }}
            className="mt-4 px-5 py-2.5 rounded-full bg-primary text-black text-sm font-bold hover:scale-[1.03] transition-transform"
          >
            Play all {artist.tracks.length} tracks
          </button>
        </div>
      </div>
    </motion.div>
  );
}
