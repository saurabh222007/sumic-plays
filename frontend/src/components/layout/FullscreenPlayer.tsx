import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Play, Pause, SkipBack, SkipForward, Volume2, Heart, Loader2, Shuffle, Repeat, ListMusic, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { getLyrics, normalizeTitle, normalizeArtist } from '../../lib/lyrics';
import { getTrackTitle } from '../../lib/musicDiscovery';
import { DynamicMusicBackdrop } from '../DynamicMusicBackdrop';

interface LyricsLine {
  text: string;
  time: number;
}

function parseSyncedLyrics(synced?: string): LyricsLine[] {
  if (!synced) return [];
  const lines: LyricsLine[] = [];
  const regex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/;
  const rawLines = synced.split('\n');
  for (const line of rawLines) {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3], 10) / (match[3].length === 2 ? 100 : 1000) : 0;
      const time = minutes * 60 + seconds + ms;
      const text = match[4].trim();
      lines.push({ text, time });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

export function FullscreenPlayer() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    volume,
    progress,
    shuffle,
    repeat,
    queue,
    setPlaying,
    setVolume,
    nextTrack,
    prevTrack,
    isFullscreen,
    setFullscreen,
    setShuffle,
    setRepeat,
    // audioElement removed; use playerEngine via store methods
    seek,
    clearQueue,
  } = usePlayerStore();

  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const { favorites, addFavorite, removeFavorite, playlists, addTrackToPlaylist, removeTrackFromPlaylist } = useLibraryStore();
  const [syncedLines, setSyncedLines] = useState<LyricsLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState('');
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsNotFound, setLyricsNotFound] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  const isLiked = !!currentTrack && favorites.some((t) => t.id === currentTrack.id);
  const currentTitle = currentTrack ? getTrackTitle(currentTrack) : '';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setFullscreen]);

  // Fetch lyrics — use normalized title to improve hit rate
  useEffect(() => {
    setSyncedLines([]);
    setPlainLyrics('');
    setLyricsNotFound(false);
    setCurrentLineIndex(-1);
    if (!currentTrack) return;
    const controller = new AbortController();
    const normTitle  = normalizeTitle(getTrackTitle(currentTrack));
    const normArtist = normalizeArtist(currentTrack.artist);
    setLyricsLoading(true);
    getLyrics(normTitle, normArtist, controller.signal)
      .then((data) => {
        if (!data) { setLyricsNotFound(true); return; }
        if (data?.syncedLyrics) {
          const parsed = parseSyncedLyrics(data.syncedLyrics);
          if (parsed.length > 0) { setSyncedLines(parsed); return; }
          const plain = data.syncedLyrics.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
          if (plain) { setPlainLyrics(plain); return; }
        }
        if (data?.plainLyrics) { setPlainLyrics(data.plainLyrics); }
        else { setLyricsNotFound(true); }
      })
      .catch((err) => { if ((err as any)?.name !== 'AbortError') setLyricsNotFound(true); })
      .finally(() => { setLyricsLoading(false); });
    return () => { controller.abort(); };
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist]);

  // Sync lyrics scroll
  useEffect(() => {
    if (syncedLines.length === 0) return;
    const index = syncedLines.findIndex((line, i) => {
      const nextLine = syncedLines[i + 1];
      return progress >= line.time && (!nextLine || progress < nextLine.time);
    });
    if (index !== -1 && index !== currentLineIndex) {
      setCurrentLineIndex(index);
      const activeLineEl = document.getElementById(`lyrics-line-${index}`);
      if (activeLineEl && lyricsContainerRef.current) {
        lyricsContainerRef.current.scrollTo({
          top: activeLineEl.offsetTop - lyricsContainerRef.current.clientHeight / 2 + activeLineEl.clientHeight / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [progress, syncedLines, currentLineIndex]);

  if (!isFullscreen || !currentTrack) return null;

  const togglePlay = () => {
    if (!currentTrack) return;
    setPlaying(!isPlaying);
  };

  const toggleLike = () => {
    if (!currentTrack) return;
    if (isLiked) {
      removeFavorite(currentTrack.id);
    } else {
      addFavorite(currentTrack);
    }
  };

  const toggleShuffle = () => setShuffle(!shuffle);

  const cycleRepeat = () => {
    if (repeat === 'off') setRepeat('all');
    else if (repeat === 'all') setRepeat('one');
    else setRepeat('off');
  };

  const handleNext = () => {
    const result = nextTrack();
    if (result instanceof Promise) {
      result.catch(console.error);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (currentTrack?.duration) {
      const bounds = e.currentTarget.getBoundingClientRect();
      const percent = Math.min(1, Math.max(0, (e.clientX - bounds.left) / bounds.width));
      const t = percent * currentTrack.duration;
      seek(t);
    }
  };

  const progressPercent = currentTrack.duration
    ? Math.min(100, Math.max(0, (progress / currentTrack.duration) * 100))
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 200, mass: 0.8 }}
        className="fixed inset-0 z-50 bg-[#050607] text-white flex flex-col overflow-hidden gpu-accelerated"
      >
        <DynamicMusicBackdrop track={currentTrack} intensity="full" />
        <div className="absolute inset-x-6 top-20 h-px bg-gradient-to-r from-transparent via-[#D8B86A]/35 to-transparent pointer-events-none" />
        <div className="absolute inset-x-6 bottom-20 h-px bg-gradient-to-r from-transparent via-[#2ED3A2]/20 to-transparent pointer-events-none" />

        {/* Top Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="relative flex items-center justify-between px-6 py-4 md:px-12 md:py-6 z-10"
        >
          <motion.button
            onClick={() => setFullscreen(false)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.85 }}
            className="w-10 h-10 rounded-full bg-white/6 hover:bg-[#D8B86A]/12 flex items-center justify-center transition border border-[#D8B86A]/20 text-[#F6F1E7]"
            aria-label="Minimize"
          >
            <ChevronDown size={24} />
          </motion.button>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center"
          >
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Now Playing</span>
          </motion.div>
          <div className="w-10 h-10" />
        </motion.header>

        {/* Main Layout */}
        <div className="relative flex-1 grid grid-cols-1 md:grid-cols-[minmax(300px,440px)_minmax(0,1fr)] gap-6 md:gap-12 items-stretch px-6 md:px-16 pb-24 md:pb-10 overflow-y-auto md:overflow-hidden z-10 max-w-6xl mx-auto w-full scrollbar-hide min-h-0">
          <div className="hidden md:block absolute left-10 top-8 h-16 w-16 border-l border-t border-[#D8B86A]/35 pointer-events-none" />
          <div className="hidden md:block absolute right-10 top-8 h-16 w-16 border-r border-t border-[#D8B86A]/20 pointer-events-none" />
          <div className="hidden md:block absolute left-10 bottom-8 h-16 w-16 border-l border-b border-[#2ED3A2]/20 pointer-events-none" />
          <div className="hidden md:block absolute right-10 bottom-8 h-16 w-16 border-r border-b border-[#D8B86A]/25 pointer-events-none" />
          {/* Left Panel: Cover Art & Controls */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', damping: 20, stiffness: 150 }}
            className="flex flex-col items-center justify-center w-full max-w-sm md:max-w-md mx-auto"
          >
            {/* Cover Art - spinning disc effect */}
            <div className="relative">
              {/* Glow behind the art */}
              <motion.div
                className="absolute inset-0 rounded-3xl opacity-40 blur-[40px] -z-10 scale-110 bg-[#D8B86A]"
                animate={{
                  boxShadow: isPlaying
                    ? ['0 0 60px 10px rgba(216,184,106,0.25)', '0 0 80px 20px rgba(46,211,162,0.18)', '0 0 60px 10px rgba(216,184,106,0.25)']
                    : '0 0 30px 5px rgba(216,184,106,0.14)',
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />

              <motion.div
                className={`w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-3xl overflow-hidden shadow-[0_28px_80px_rgba(0,0,0,0.55)] border border-[#D8B86A]/20 ${isPlaying ? 'animate-playing-pulse' : ''}`}
              >
                <motion.img
                  layoutId="player-album-art"
                  src={currentTrack.thumbnail}
                  alt={currentTitle}
                  className="w-full h-full object-cover"
                  transition={{ type: 'spring', damping: 25, stiffness: 200, duration: 0.5 }}
                />
              </motion.div>

              {/* Audio bars on the cover when playing */}
              {isPlaying && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2"
                >
                  <div className="audio-bars">
                    <span /><span /><span /><span />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Meta with slide-in animation */}
            <motion.div
              key={currentTrack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="w-full mt-8 flex items-center justify-between gap-4"
            >
              <div className="overflow-hidden flex-1 text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white truncate drop-shadow-md">{currentTitle}</h1>
                <p className="text-white/60 text-base md:text-lg font-medium truncate mt-1">{currentTrack.artist}</p>
              </div>
              <motion.button
                onClick={toggleLike}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.8 }}
                className="shrink-0 w-11 h-11 rounded-xl bg-white/5 hover:bg-[#D8B86A]/10 flex items-center justify-center border border-[#D8B86A]/15"
              >
                <motion.span animate={isLiked ? { scale: [1, 1.18, 1] } : { scale: 1 }} transition={{ duration: 0.35 }}>
                  <Heart size={20} className={isLiked ? 'fill-[#D8B86A] text-[#D8B86A]' : 'text-white/70'} />
                </motion.span>
              </motion.button>

              <div className="relative shrink-0 flex items-center">
                <motion.button
                  onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.8 }}
                  className={`shrink-0 w-11 h-11 rounded-xl bg-white/5 hover:bg-[#D8B86A]/10 flex items-center justify-center border border-[#D8B86A]/15 transition-colors ${showPlaylistMenu ? 'text-[#D8B86A]' : 'text-white/70 hover:text-white'}`}
                  title="Add to Playlist"
                >
                  <Plus size={20} />
                </motion.button>

                {showPlaylistMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 cursor-default" 
                      onClick={() => setShowPlaylistMenu(false)}
                    />
                    <div className="absolute right-0 bottom-14 w-48 rounded-xl bg-[#0B0E10]/98 backdrop-blur-xl border border-[#D8B86A]/20 p-1.5 shadow-2xl z-50 animate-fade-in flex flex-col gap-0.5 text-left">
                      <p className="text-[10px] font-bold text-text-muted px-2.5 py-1.5 uppercase tracking-wider select-none">Add to playlist</p>
                      {playlists.length === 0 ? (
                        <p className="text-xs text-text-secondary px-2.5 py-1.5 italic">No playlists found</p>
                      ) : (
                        playlists.map((playlist) => {
                          const exists = playlist.tracks.some(t => t.id === currentTrack.id);
                          return (
                            <button
                              key={playlist.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (exists) {
                                  removeTrackFromPlaylist(playlist.id, currentTrack.id);
                                } else {
                                  addTrackToPlaylist(playlist.id, currentTrack);
                                }
                                setShowPlaylistMenu(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between ${
                                exists 
                                  ? 'text-[#F2D98B] bg-[#D8B86A]/10 hover:bg-[#D8B86A]/20' 
                                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                              }`}
                            >
                              <span className="truncate text-white">{playlist.name}</span>
                              {exists && <span className="text-[9px] uppercase tracking-wider font-bold text-[#F2D98B]">Added</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>

            {/* Progress Slider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="w-full mt-6"
            >
              <div
                className="h-1.5 bg-[#1B2024] rounded-full w-full relative group cursor-pointer"
                onClick={handleProgressClick}
              >
                <motion.div
                  className="h-full rounded-full absolute left-0 top-0 bg-gradient-to-r from-[#D8B86A] via-[#F2D98B] to-[#2ED3A2]"
                  style={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
                <motion.div
                  className="w-4 h-4 rounded-full bg-[#F8E7AE] absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 shadow-[0_0_18px_rgba(216,184,106,0.7)]"
                  style={{ left: `calc(${progressPercent}% - 8px)` }}
                  transition={{ duration: 0.15 }}
                />
              </div>
              <div className="flex justify-between items-center mt-2.5 text-xs text-white/50 font-semibold">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(currentTrack.duration)}</span>
              </div>
            </motion.div>

            {/* Controls */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="w-full mt-5 flex items-center justify-center gap-8"
            >
              <motion.button
                onClick={toggleShuffle}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.8 }}
                className={`transition-all ${shuffle ? 'text-[#D8B86A]' : 'text-white/40 hover:text-white'}`}
              >
                <motion.span animate={shuffle ? { rotate: [0, -12, 12, 0] } : { rotate: 0 }} transition={{ duration: 0.45 }}>
                  <Shuffle size={20} />
                </motion.span>
              </motion.button>

              <motion.button
                onClick={clearQueue}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.8 }}
                className={`transition-all ${queue.length === 0 ? 'text-white/20' : 'text-white/40 hover:text-white'}`}
                title="Clear queue"
              >
                <ListMusic size={20} />
              </motion.button>

              <motion.button
                onClick={prevTrack}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.8 }}
                className="text-white/70 hover:text-white transition"
              >
                <SkipBack size={28} className="fill-current" />
              </motion.button>

              <motion.button
                onClick={togglePlay}
                disabled={false}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.88 }}
                className="w-16 h-16 rounded-full bg-[#F2D98B] text-[#050607] flex items-center justify-center shadow-[0_0_36px_rgba(216,184,106,0.35)] hover:bg-[#FFE7A3] disabled:opacity-60 shrink-0"
              >
                <AnimatePresence mode="wait">
                  {(isLoading && !isPlaying) ? (
                    <motion.div key="load" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Loader2 size={28} className="animate-spin text-black" />
                    </motion.div>
                  ) : isPlaying ? (
                    <motion.div key="pause" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.15 }}>
                      <Pause size={28} className="fill-current" />
                    </motion.div>
                  ) : (
                    <motion.div key="play" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.15 }}>
                      <Play size={28} className="fill-current ml-1" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.button
                onClick={handleNext}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.8 }}
                className="text-white/70 hover:text-white transition"
              >
                <SkipForward size={28} className="fill-current" />
              </motion.button>

              <motion.button
                onClick={cycleRepeat}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.8 }}
                className={`transition-all relative ${repeat !== 'off' ? 'text-[#D8B86A]' : 'text-white/40 hover:text-white'}`}
              >
                <motion.span animate={repeat !== 'off' ? { rotate: 360 } : { rotate: 0 }} transition={{ duration: 0.5 }}>
                  <Repeat size={20} />
                </motion.span>
                {repeat === 'one' && <span className="absolute text-[8px] font-bold -top-1.5 -right-1.5">1</span>}
              </motion.button>
            </motion.div>

            {/* Volume */}
            <div className="w-full mt-6 hidden md:flex items-center gap-3 text-white/40 px-2">
              <Volume2 size={16} />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 accent-[#D8B86A] cursor-pointer h-1 rounded-full bg-[#1B2024]"
              />
            </div>
          </motion.div>

          {/* Right Panel: Lyrics */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="w-full h-full min-h-[420px] md:min-h-0 flex flex-col overflow-hidden py-4 md:pl-8"
          >
            <div
              ref={lyricsContainerRef}
              className="flex-1 min-h-0 overflow-y-auto scrollbar-hide select-none flex flex-col items-center gap-8 scroll-smooth rounded-2xl border border-[#D8B86A]/10 bg-black/10 px-4 md:px-8 pb-28"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
              }}
            >
              <div className="h-[28vh] shrink-0 w-full" />

              {lyricsLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-white/50 py-12">
                  <Loader2 size={28} className="animate-spin text-white" />
                  <span className="text-xs font-semibold tracking-widest uppercase">Syncing Lyrics...</span>
                </div>
              ) : lyricsNotFound ? (
                <div className="h-full flex flex-col items-center justify-center text-white/30 py-12 text-center gap-2">
                  <p className="text-base font-bold">Lyrics currently unavailable</p>
                  <p className="text-xs opacity-60">Enjoy the music ♪</p>
                </div>
              ) : syncedLines.length > 0 ? (
                syncedLines.map((line, idx) => {
                  const isActive = idx === currentLineIndex;
                  return (
                    <motion.div
                      key={idx}
                      id={`lyrics-line-${idx}`}
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: isActive ? 1 : 0.3,
                        scale: isActive ? 1.08 : 1,
                        filter: isActive ? 'blur(0px)' : 'blur(0.5px)',
                      }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="text-xl md:text-3xl lg:text-4xl font-extrabold leading-snug text-center cursor-pointer origin-center max-w-2xl text-white break-words"
                      onClick={() => {
                        seek(line.time);
                      }}
                    >
                      {line.text}
                    </motion.div>
                  );
                })
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-lg md:text-2xl font-extrabold text-white/55 leading-loose text-center max-w-2xl break-words">
                  {plainLyrics}
                </pre>
              )}

              <div className="h-[45vh] shrink-0 w-full" />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
