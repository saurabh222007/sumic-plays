import { useState, useRef, useCallback } from 'react';
import { Search as SearchIcon, Sparkles, Music2, Mic2, X, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore, type Track } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useAuthStore } from '../store/useAuthStore';
import { interpretFeeling, type FeelingResult, isAiDisabled } from '../lib/gemini';
import { buildDiscoveryQueries, buildSearchSections, dedupeTracks, rankTracks, type SearchSections } from '../lib/musicDiscovery';
import { TrackCard } from '../components/TrackCard';
import { ArtistSpotlight } from '../components/ArtistSpotlight';
import { SkeletonLoader } from '../components/SkeletonLoader';

type SearchMode = 'songs' | 'lyrics' | 'feeling';

export function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('songs');
  const [feelingResult, setFeelingResult] = useState<FeelingResult | null>(null);
  const [searchSections, setSearchSections] = useState<SearchSections | null>(null);
  const [aiError, setAiError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const { playQueue } = usePlayerStore();
  const { addRecent } = useLibraryStore();
  const { geminiApiKey } = useAuthStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchTracks = useCallback(async (q: string, signal?: AbortSignal): Promise<Track[]> => {
    const res = await fetch(`http://localhost:5000/api/music/search?q=${encodeURIComponent(q)}`, { signal });
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }, []);

  const fetchDiscoveryTracks = useCallback(async (q: string, topTrack: Track | null, signal: AbortSignal) => {
    const queries = [
      ...buildDiscoveryQueries(q, topTrack).slice(0, 3),
      `${q} lyrics slowed reverb acoustic remix cover live`,
    ];
    const responses = await Promise.allSettled(
      queries.map((query) => fetchTracks(query, signal).then((tracks) => tracks.slice(0, 6)))
    );

    return responses.flatMap((response) => {
      if (response.status === 'fulfilled') return response.value;
      return [];
    });
  }, [fetchTracks]);

  // Debounced search for songs mode
  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearchSections(null);
      setHasSearched(false);
      return;
    }
    
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    
    setLoading(true);
    setHasSearched(true);
    setResults([]);
    setSearchSections(null);
    
    try {
      const signal = controller.signal;
      const data = await fetchTracks(q, signal);
      if (signal.aborted) return;
      
      const ranked = rankTracks(q, data, { limit: 60, minDuration: 45, maxDuration: 720, preferOriginals: true });
      const topTrack = ranked.find((track) => track.version !== 'modified' && track.version !== 'lyrics' && track.version !== 'alternative') || ranked[0] || null;
      
      const discoveryTracks = topTrack ? await fetchDiscoveryTracks(q, topTrack, signal) : [];
      if (signal.aborted) return;
      
      const sectionTracks = dedupeTracks([...data, ...discoveryTracks]);
      const sections = buildSearchSections(q, sectionTracks, discoveryTracks);
      
      setResults(sections.allTracks);
      setSearchSections(sections);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Search error:', error);
      setResults([]);
      setSearchSections(null);
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [fetchDiscoveryTracks, fetchTracks]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (searchMode === 'songs') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // debounce to prevent excessive requests while typing
      debounceRef.current = setTimeout(() => performSearch(value), 400);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (searchMode === 'lyrics') {
      abortRef.current?.abort();
      setLoading(true);
      setHasSearched(true);
      setSearchSections(null);
      setResults([]);
      try {
        const res = await fetch(`http://localhost:5000/api/music/search?q=${encodeURIComponent(query + ' lyrics')}`);
        if (res.ok) setResults(await res.json());
      } catch (e) {
        console.error(e);
        setSearchSections(null);
      } finally {
        setLoading(false);
      }
    } else if (searchMode === 'feeling') {
      // AI feeling interpretation
      if (!geminiApiKey) return;
      abortRef.current?.abort();
      setLoading(true);
      setHasSearched(true);
      setAiError('');
      setFeelingResult(null);
      setSearchSections(null);
      setResults([]);
      try {
        const feeling = await interpretFeeling(geminiApiKey, query);
        setFeelingResult(feeling);
        // Search for tracks based on interpreted queries
        const allTracks: Track[] = [];
        for (const sq of feeling.searchQueries.slice(0, 3)) {
          const res = await fetch(`http://localhost:5000/api/music/search?q=${encodeURIComponent(sq)}`);
          if (res.ok) {
            const data = await res.json();
            allTracks.push(...data.slice(0, 3));
          }
        }
        // Deduplicate
        const seen = new Set<string>();
        const unique = allTracks.filter(t => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
        setResults(unique);
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : String(e);
        setAiError(msg);
      } finally {
        setLoading(false);
      }
    } else {
      performSearch(query);
    }
  };

  const handlePlayAll = () => {
    const queueTracks = searchSections?.allTracks.length ? searchSections.allTracks : results;
    if (queueTracks.length > 0) {
      playQueue(queueTracks, 0);
      addRecent(queueTracks[0]);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearchSections(null);
    setFeelingResult(null);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const modeTabs: { id: SearchMode; label: string; icon: typeof SearchIcon; requiresAI?: boolean }[] = [
    { id: 'songs', label: 'Songs', icon: Music2 },
    { id: 'lyrics', label: 'Lyrics', icon: Mic2 },
    { id: 'feeling', label: 'Feeling', icon: Sparkles, requiresAI: true },
  ];

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-4xl mx-auto w-full">
      {/* Search Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary mb-4">Search</h1>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-4">
          {modeTabs.map((tab) => {
            if (tab.requiresAI && (!geminiApiKey || isAiDisabled())) return null;
            return (
              <button
                key={tab.id}
                onClick={() => { setSearchMode(tab.id); setResults([]); setSearchSections(null); setFeelingResult(null); setHasSearched(false); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  searchMode === tab.id
                    ? 'bg-primary text-black'
                    : 'bg-surface-light text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={
              searchMode === 'songs' ? 'Search songs, artists, albums...' :
              searchMode === 'lyrics' ? 'Search by lyrics "I found a love for me"...' :
              'How are you feeling? "I miss someone"...'
            }
            className="w-full glass rounded-2xl py-4 pl-12 pr-12 text-text-primary outline-none focus:border-primary/50 transition-all text-sm md:text-base placeholder:text-text-muted"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition"
            >
              <X size={18} />
            </button>
          )}
        </form>
        {aiError && <p className="text-xs text-red-400 mt-2 font-semibold">{aiError}</p>}
      </motion.div>

      {/* Feeling Result Badge */}
      <AnimatePresence>
        {feelingResult && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="glass rounded-2xl p-4 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-primary" />
                <span className="text-sm font-semibold text-primary">AI Interpreted Mood</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-bold">
                  {feelingResult.mood}
                </span>
                {feelingResult.keywords.map((kw, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-surface-light text-text-secondary text-xs font-medium">
                    {kw}
                  </span>
                ))}
              </div>
              <p className="text-xs text-text-muted mt-2 flex items-center gap-1.5"><Music size={12} /> {feelingResult.playlistTheme}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Artist Spotlight (appears for artist-like searches) */}
      {hasSearched && results.length > 0 && searchMode === 'songs' && (
        <ArtistSpotlight query={query} results={results} />
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-8">
          <SkeletonLoader variant="list-item" count={6} />
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {searchSections ? (
            <>
              {searchSections.topResult && (
                <section className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-lg font-bold text-text-primary">Top Result</h2>
                      <p className="text-xs text-text-muted mt-0.5">Best match for “{query}”</p>
                    </div>
                    <button
                      onClick={() => {
                        playQueue(searchSections.allTracks, 0);
                        addRecent(searchSections.topResult as Track);
                      }}
                      className="text-xs font-semibold text-primary hover:text-primary-light transition"
                    >
                      Play result
                    </button>
                  </div>
                  <div className="bg-surface/30 rounded-2xl p-2 border border-glass-border">
                    <TrackCard track={searchSections.topResult} index={0} variant="list" contextTracks={searchSections.allTracks} contextStartIndex={0} />
                  </div>
                </section>
              )}

              {searchSections.sameArtistSongs.length > 0 && (
                <section className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-lg font-bold text-text-primary">More by {searchSections.topResult?.artist}</h2>
                      <p className="text-xs text-text-muted mt-0.5">Other songs by this artist</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 bg-surface/30 rounded-2xl p-2 border border-glass-border">
                    {searchSections.sameArtistSongs.map((track, idx) => (
                      <TrackCard key={track.id + idx} track={track} index={idx} variant="list" contextTracks={searchSections.allTracks} contextStartIndex={Math.max(0, searchSections.allTracks.findIndex((item) => item.id === track.id))} />
                    ))}
                  </div>
                </section>
              )}

              {searchSections.relatedSongs.length > 0 && (
                <section className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-lg font-bold text-text-primary">Covers & Related Versions</h2>
                      <p className="text-xs text-text-muted mt-0.5">Versions of this song by other artists</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 bg-surface/30 rounded-2xl p-2 border border-glass-border">
                    {searchSections.relatedSongs.map((track, idx) => (
                      <TrackCard key={track.id + idx} track={track} index={idx} variant="list" contextTracks={searchSections.allTracks} contextStartIndex={Math.max(0, searchSections.allTracks.findIndex((item) => item.id === track.id))} />
                    ))}
                  </div>
                </section>
              )}

              {searchSections.songs.length > 0 && (
                <section className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-text-primary">Songs <span className="text-text-muted text-sm font-normal">Original versions</span></h2>
                  </div>
                  <div className="flex flex-col gap-0.5 bg-surface/30 rounded-2xl p-2 border border-glass-border">
                    {searchSections.songs.map((track, idx) => (
                      <TrackCard key={track.id + idx} track={track} index={idx} variant="list" contextTracks={searchSections.allTracks} contextStartIndex={Math.max(0, searchSections.allTracks.findIndex((item) => item.id === track.id))} />
                    ))}
                  </div>
                </section>
              )}

              {searchSections.alternativeVersions.length > 0 && (
                <section className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-text-primary">Alternative Versions</h2>
                    <p className="text-xs text-text-muted">Lyrics, live, acoustic, remix, and edited uploads</p>
                  </div>
                  <div className="flex flex-col gap-0.5 bg-surface/30 rounded-2xl p-2 border border-glass-border">
                    {searchSections.alternativeVersions.map((track, idx) => (
                      <TrackCard key={track.id + idx} track={track} index={idx} variant="list" contextTracks={searchSections.allTracks} contextStartIndex={Math.max(0, searchSections.allTracks.findIndex((item) => item.id === track.id))} />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-text-primary">
                  {feelingResult ? `${feelingResult.playlistTheme}` : 'Results'}
                  <span className="text-text-muted text-sm font-normal ml-2">({results.length})</span>
                </h2>
                {results.length > 1 && (
                  <button
                    onClick={handlePlayAll}
                    className="text-sm font-semibold text-primary hover:text-primary-light transition"
                  >
                    Play all
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                {results.map((track, idx) => (
                  <TrackCard key={track.id + idx} track={track} index={idx} variant="list" />
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* No Results */}
      {!loading && hasSearched && results.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-20"
        >
          <Music2 size={48} className="mx-auto text-text-muted mb-4 opacity-50" />
          <p className="text-lg text-text-secondary font-medium">No results found</p>
          <p className="text-sm text-text-muted mt-1">Try different keywords or switch search mode</p>
        </motion.div>
      )}

      {/* Empty State */}
      {!hasSearched && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mt-16 md:mt-20"
        >
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6">
            {searchMode === 'feeling' ? <Sparkles size={32} className="text-primary" /> :
             searchMode === 'lyrics' ? <Mic2 size={32} className="text-primary" /> :
             <SearchIcon size={32} className="text-primary" />}
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">
            {searchMode === 'feeling' ? 'Tell us how you feel' :
             searchMode === 'lyrics' ? 'Search by lyrics' :
             'Discover something new'}
          </h3>
          <p className="text-sm text-text-secondary max-w-sm mx-auto">
            {searchMode === 'feeling' ? 'Type any feeling like "I miss someone" or "Need motivation" and AI will create a playlist for you.' :
             searchMode === 'lyrics' ? 'Type any lyrics you remember and we\'ll find the song for you.' :
             'Search by song name, artist, or album to find your next favorite track.'}
          </p>
        </motion.div>
      )}
    </div>
  );
}
