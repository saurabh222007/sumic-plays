import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Zap, Sparkles, Music, Mic2, Globe, Guitar, Loader2 } from 'lucide-react';
import { usePlayerStore, type Track } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useAuthStore } from '../store/useAuthStore';
import { TrackCard } from '../components/TrackCard';
import { HorizontalScroll } from '../components/HorizontalScroll';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { VibeSearch } from '../components/VibeSearch';
import { isAiDisabled } from '../lib/gemini';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Late night vibes';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Night owl mode';
}

export function Home() {
  const [trending, setTrending] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [loadingDiscovery, setLoadingDiscovery] = useState<string | null>(null);

  const { playQueue } = usePlayerStore();
  const { recent, addRecent } = useLibraryStore();
  const { geminiApiKey } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`${API_URL}/api/music/trending`, { signal: AbortSignal.timeout(10000) })
      .then(res => {
        if (!res.ok) throw new Error('Search failed');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTrending(data);
        } else {
          setError('Could not load trending songs');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Trending songs fetch error:', err);
        setError('Unable to load trending songs. Please refresh the page.');
        setLoading(false);
      });
  }, []);

  const seedId = recent[0]?.id || trending[0]?.id;

  useEffect(() => {
    const seedTrack = recent[0] || trending[0];
    if (!seedTrack) return;

    setLoadingRecs(true);
    const url = `${API_URL}/api/music/recommendations?artist=${encodeURIComponent(seedTrack.artist)}&title=${encodeURIComponent(seedTrack.title)}&trackId=${seedTrack.id}`;
    
    fetch(url, { signal: AbortSignal.timeout(12000) })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load recommendations');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setRecommendations(data);
        }
        setLoadingRecs(false);
      })
      .catch(err => {
        console.error('Recommendations fetch error:', err);
        setLoadingRecs(false);
      });
  }, [seedId]);

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-7xl mx-auto w-full">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 md:mb-8"
      >
        <h1 className="text-2xl md:text-4xl font-extrabold text-text-primary tracking-tight flex items-center gap-3">
          {getGreeting()} <Sparkles className="text-primary animate-pulse" size={28} />
        </h1>
        <p className="text-sm md:text-base text-text-secondary mt-1">Discover music that matches your mood</p>
      </motion.div>

      {/* AI Vibe Search (only if AI key available and not disabled) */}
      {geminiApiKey && !isAiDisabled() && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <VibeSearch />
        </motion.div>
      )}

      {/* Mood Categories removed per request */}

      {/* Recently Played */}
      {recent.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8 md:mb-10"
        >
          <div className="flex items-center gap-2 mb-4 md:mb-5">
            <Clock size={20} className="text-primary" />
            <h2 className="text-xl md:text-2xl font-bold text-text-primary">Recently Played</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {recent.slice(0, 6).map((track, idx) => (
              <TrackCard key={track.id + idx} track={track} index={idx} variant="compact" />
            ))}
          </div>
        </motion.div>
      )}

      {/* Trending */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="mb-8 md:mb-10"
      >
        <div className="flex items-center gap-2 mb-4 md:mb-5">
          <TrendingUp size={20} className="text-accent" />
          <h2 className="text-xl md:text-2xl font-bold text-text-primary">Trending Now</h2>
        </div>
        {loading ? (
          <SkeletonLoader variant="card" count={6} />
        ) : error ? (
          <div className="p-6 rounded-xl bg-surface-light border border-glass-border text-center">
            <p className="text-text-secondary mb-3">{error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-black rounded-lg font-semibold hover:bg-primary-light transition">
              Retry
            </button>
          </div>
        ) : trending.length > 0 ? (
          <HorizontalScroll showArrows={true}>
            {trending.map((track, idx) => (
              <TrackCard key={track.id + idx} track={track} index={idx} variant="card" contextTracks={trending} contextStartIndex={idx} />
            ))}
          </HorizontalScroll>
        ) : (
          <div className="p-6 rounded-xl bg-surface-light border border-glass-border text-center text-text-secondary">
            No songs available. Try searching instead!
          </div>
        )}
      </motion.div>

      {/* Recommended for You */}
      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28 }}
          className="mb-8 md:mb-10"
        >
          <div className="flex items-center justify-between mb-4 md:mb-5">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-primary animate-pulse" />
              <h2 className="text-xl md:text-2xl font-bold text-text-primary">Recommended for You</h2>
            </div>
            {recent.length > 0 && (
              <span className="text-xs text-text-secondary italic">Based on your recent listening</span>
            )}
          </div>
          {loadingRecs ? (
            <SkeletonLoader variant="card" count={6} />
          ) : (
            <HorizontalScroll showArrows={true}>
              {recommendations.map((track, idx) => (
                <TrackCard key={track.id + idx} track={track} index={idx} variant="card" contextTracks={recommendations} contextStartIndex={idx} />
              ))}
            </HorizontalScroll>
          )}
        </motion.div>
      )}

      {/* Quick Discovery */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-4 md:mb-5">
          <Zap size={20} className="text-mood-motivation" />
          <h2 className="text-xl md:text-2xl font-bold text-text-primary">Quick Discovery</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: 'Top Bollywood', query: 'bollywood hits 2024', icon: Music },
            { label: 'Punjabi Hits', query: 'punjabi songs 2024', icon: Mic2 },
            { label: 'Global Top 50', query: 'global top 50 songs', icon: Globe },
            { label: 'Rock Anthems', query: 'rock anthems playlist', icon: Guitar },
          ].map((item) => {
            const isThisLoading = loadingDiscovery === item.label;
            return (
              <motion.button
                key={item.label}
                disabled={loadingDiscovery !== null}
                whileHover={loadingDiscovery === null ? { scale: 1.02 } : {}}
                whileTap={loadingDiscovery === null ? { scale: 0.98 } : {}}
                className={`p-4 rounded-2xl bg-surface-light border border-glass-border transition-all text-left group flex items-center gap-3 relative overflow-hidden ${
                  loadingDiscovery !== null ? 'opacity-75 cursor-not-allowed' : 'hover:bg-surface-hover cursor-pointer'
                }`}
                onClick={async () => {
                  if (loadingDiscovery) return;
                  setLoadingDiscovery(item.label);
                  try {
                    const res = await fetch(`${API_URL}/api/music/search?q=${encodeURIComponent(item.query)}`, { signal: AbortSignal.timeout(10000) });
                    const data = await res.json();
                    const tracks = Array.isArray(data) ? data.slice(0, 10) : [];
                    if (tracks.length > 0) {
                      playQueue(tracks, 0);
                      addRecent(tracks[0]);
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setLoadingDiscovery(null);
                  }
                }}
              >
                {isThisLoading ? (
                  <Loader2 size={20} className="text-primary animate-spin shrink-0" />
                ) : (
                  <item.icon size={20} className="text-text-secondary group-hover:text-primary transition-colors shrink-0" />
                )}
                <span className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors">
                  {isThisLoading ? 'Loading...' : item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
