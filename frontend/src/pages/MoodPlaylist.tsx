import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, ArrowLeft, Sparkles } from 'lucide-react';
import { getMoodById, type MoodConfig } from '../lib/moodConfig';
import { usePlayerStore, type Track } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useVibeStore } from '../store/useVibeStore';
import { TrackCard } from '../components/TrackCard';
import { SkeletonLoader } from '../components/SkeletonLoader';

export function MoodPlaylist() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mood, setMood] = useState<MoodConfig | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const { playQueue, clearQueue } = usePlayerStore();
  const { addRecent } = useLibraryStore();
  const { setVibe, setVibeColor } = useVibeStore();

  useEffect(() => {
    if (!id) return;
    clearQueue();
    const moodConfig = getMoodById(id);
    if (!moodConfig) {
      navigate('/mood');
      return;
    }
    setMood(moodConfig);
    setVibe(moodConfig.vibeType);
    setVibeColor(moodConfig.color);

    setLoading(true);
    // Fetch tracks using the first search query of the mood
    const query = moodConfig.searchQueries[0];
    fetch(`${API_URL}/api/music/search?q=${encodeURIComponent(query)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Search failed');
        return res.json();
      })
      .then((data) => {
        setTracks(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching mood tracks:', err);
        setLoading(false);
      });
  }, [id, navigate, setVibe, setVibeColor, clearQueue]);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playQueue(tracks, 0);
      addRecent(tracks[0]);
    }
  };

  if (!mood) return null;

  return (
    <div className="relative min-h-full">
      {/* Background Gradient Header */}
      <div 
        className="absolute top-0 left-0 right-0 h-80 opacity-30 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top, ${mood.color}60, transparent 70%)` }}
      />

      <div className="relative z-10 px-4 md:px-8 pt-6 max-w-4xl mx-auto w-full">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-semibold">Back</span>
        </button>

        {/* Playlist Header */}
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-end mb-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-32 h-32 md:w-40 md:h-40 rounded-3xl flex items-center justify-center shadow-elevated shrink-0 select-none border border-white/10"
            style={{ background: `linear-gradient(135deg, ${mood.color}40, ${mood.color}18)`, boxShadow: `0 12px 40px ${mood.color}30` }}
          >
            {mood.icon && <mood.icon size={64} style={{ color: mood.color, filter: `drop-shadow(0 0 12px ${mood.color}90)` }} />}
          </motion.div>

          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles size={14} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Auto-Generated Vibe Mix</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-text-primary tracking-tight mb-2">
              {mood.name} Vibe
            </h1>
            <p className="text-sm text-text-secondary">
              A dynamic collection of tracks matching the emotional context of <span className="font-semibold text-text-primary">#{mood.name.toLowerCase()}</span>.
            </p>
          </div>
        </div>

        {/* Action Bar */}
        {tracks.length > 0 && !loading && (
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-black font-bold hover:scale-[1.03] transition-all shadow-lg"
            >
              <Play size={18} className="fill-current" />
              <span>Play All</span>
            </button>
            <span className="text-sm text-text-secondary">{tracks.length} songs loaded</span>
          </div>
        )}

        {/* Tracks List */}
        {loading ? (
          <SkeletonLoader variant="list-item" count={6} />
        ) : tracks.length > 0 ? (
          <div className="flex flex-col gap-0.5 bg-surface/30 rounded-2xl p-2 border border-glass-border">
            {tracks.map((track, idx) => (
              <TrackCard key={track.id + idx} track={track} index={idx} variant="list" contextTracks={tracks} contextStartIndex={idx} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-text-secondary">
            <p className="text-lg font-semibold">No tracks found for this mood</p>
            <p className="text-sm mt-1">Try reloading or checking your connection.</p>
          </div>
        )}
      </div>
    </div>
  );
}
