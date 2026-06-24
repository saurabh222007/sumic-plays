import { useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Mic2, Heart, Maximize2, Shuffle, Repeat, ListMusic, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { getTrackTitle } from '../../lib/musicDiscovery';

export function BottomPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    progress,
    isLoading,
    shuffle,
    repeat,
    queue,
    setPlaying,
    nextTrack,
    prevTrack,
    setVolume,
    setFullscreen,
    setShuffle,
    setRepeat,
    clearQueue,
  } = usePlayerStore();

  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const { favorites, addFavorite, removeFavorite, playlists, addTrackToPlaylist, removeTrackFromPlaylist } = useLibraryStore();
  const { seek } = usePlayerStore();

  const isLiked = !!currentTrack && favorites.some((t) => t.id === currentTrack.id);
  const currentTitle = currentTrack ? getTrackTitle(currentTrack) : '';

  useEffect(() => {
    // progress updates and isPlaying are synchronized via playerEngine event subscriptions
    // volume changes are applied via store.setVolume which calls playerEngine.setVolume
  }, []);

  const handleNextClick = () => {
    void nextTrack();
  };

  const togglePlay = () => {
    if (!currentTrack) return;
    setPlaying(!isPlaying);
  };

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentTrack) return;
    if (isLiked) {
      removeFavorite(currentTrack.id);
    } else {
      addFavorite(currentTrack);
    }
  };

  const toggleShuffle = () => {
    setShuffle(!shuffle);
  };

  const cycleRepeat = () => {
    if (repeat === 'off') setRepeat('all');
    else if (repeat === 'all') setRepeat('one');
    else setRepeat('off');
  };

  if (!currentTrack) return null;

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
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="h-20 bg-[#080A0C]/95 backdrop-blur-xl border-t border-[#D8B86A]/20 shadow-[0_-18px_60px_rgba(0,0,0,0.45)] flex flex-col justify-between fixed bottom-[58px] md:bottom-0 left-0 right-0 z-40 select-none gpu-accelerated"
      >
        {/* Top Full Width Progress Bar */}
        <div
          className="h-1 bg-[#1B2024] w-full relative group cursor-pointer"
          onClick={handleProgressClick}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-[#D8B86A] via-[#F2D98B] to-[#2ED3A2] absolute left-0 top-0"
            style={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
          <motion.div
            className="w-3 h-3 rounded-full bg-[#F8E7AE] shadow-[0_0_16px_rgba(216,184,106,0.65)] absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
            style={{ left: `calc(${progressPercent}% - 6px)` }}
            transition={{ duration: 0.15 }}
          />
        </div>

        {/* Player handled by unified PlayerEngine; no inline audio/iframe elements here */}

        <div className="flex-1 flex items-center justify-between px-4">
          {/* Left: Track Info */}
          <motion.div
            className="flex items-center gap-3 w-1/3 min-w-[150px] cursor-pointer group"
            onClick={() => setFullscreen(true)}
            whileTap={{ scale: 0.97 }}
          >
            <div className={`relative w-11 h-11 shrink-0 rounded-lg overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.35)] ring-1 ring-[#D8B86A]/25 ${isPlaying ? 'animate-playing-pulse' : ''}`}>
              <motion.img
                layoutId="player-album-art"
                src={currentTrack.thumbnail}
                alt={currentTitle}
                className="w-full h-full object-cover"
                transition={{ type: 'spring', damping: 25, stiffness: 200, duration: 0.5 }}
              />
              {/* Audio bars overlay while playing */}
              {isPlaying && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                  <div className="audio-bars">
                    <span /><span /><span /><span />
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                <Maximize2 size={14} className="text-white" />
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <motion.span
                key={currentTrack.id + '-title'}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="text-[#F6F1E7] text-xs md:text-sm font-semibold truncate hover:text-[#F2D98B] transition-colors"
              >
                {currentTitle}
              </motion.span>
              <motion.span
                key={currentTrack.id + '-artist'}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="text-[#9AA3A7] text-[10px] md:text-xs truncate"
              >
                {currentTrack.artist}
              </motion.span>
            </div>
          </motion.div>

          {/* Center: Controls */}
          <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="flex items-center gap-4 md:gap-6">
              <motion.button
                onClick={toggleShuffle}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
                className={`transition cursor-pointer hidden md:block ${
                  shuffle ? 'text-[#D8B86A]' : 'text-[#758087] hover:text-[#D8DEE2]'
                }`}
                title="Shuffle"
              >
                <Shuffle size={16} />
              </motion.button>

              <motion.button
                onClick={prevTrack}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.8 }}
                className="text-[#A4ADB2] hover:text-[#F6F1E7] transition cursor-pointer"
              >
                <SkipBack size={18} className="fill-current" />
              </motion.button>

              <motion.button
                onClick={togglePlay}
                disabled={false}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.88 }}
                className="w-9 h-9 rounded-full bg-[#F2D98B] text-[#080A0C] flex items-center justify-center shadow-[0_0_24px_rgba(216,184,106,0.28)] hover:bg-[#FFE7A3] disabled:opacity-75 cursor-pointer"
              >
                <AnimatePresence mode="wait">
                  {(isLoading && !isPlaying) ? (
                    <motion.div
                      key="loader"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.15 }}
                      className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"
                    />
                  ) : isPlaying ? (
                    <motion.div
                      key="pause"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Pause size={16} className="fill-current" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="play"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Play size={16} className="fill-current ml-0.5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.button
                onClick={handleNextClick}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.8 }}
                className="text-[#A4ADB2] hover:text-[#F6F1E7] transition cursor-pointer"
              >
                <SkipForward size={18} className="fill-current" />
              </motion.button>

              <motion.button
                onClick={cycleRepeat}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
                className={`transition cursor-pointer hidden md:block relative ${
                  repeat !== 'off' ? 'text-[#D8B86A]' : 'text-[#758087] hover:text-[#D8DEE2]'
                }`}
                title={`Repeat: ${repeat}`}
              >
                <Repeat size={16} />
                {repeat === 'one' && <span className="absolute text-[8px] font-bold -top-1.5 -right-1.5">1</span>}
              </motion.button>
            </div>

            {/* Time indicator */}
            <div className="flex items-center gap-2 text-[10px] text-[#8D969B]">
              <span>{formatTime(progress)}</span>
              <span>/</span>
              <span>{formatTime(currentTrack.duration)}</span>
            </div>
          </div>

          {/* Right: Extra Controls */}
          <div className="flex items-center justify-end w-1/3 gap-3 md:gap-4 min-w-[120px] text-[#A4ADB2]">
          <motion.button
            onClick={clearQueue}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.8 }}
            className={`cursor-pointer p-1 ${queue.length === 0 ? 'opacity-40' : ''}`}
            title="Clear queue"
          >
            <ListMusic size={18} />
          </motion.button>

          <motion.button
            onClick={toggleLike}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.8 }}
            className="cursor-pointer p-1 text-[#A4ADB2]"
            title="Like song"
          >
            <Heart size={18} className={isLiked ? 'fill-[#D8B86A] text-[#D8B86A]' : 'hover:text-[#F6F1E7]'} />
          </motion.button>

          <div className="relative shrink-0 flex items-center">
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                setShowPlaylistMenu(!showPlaylistMenu);
              }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.8 }}
              className={`cursor-pointer p-1 transition-colors ${showPlaylistMenu ? 'text-[#D8B86A]' : 'text-[#A4ADB2] hover:text-[#F6F1E7]'}`}
              title="Add to Playlist"
            >
              <Plus size={18} />
            </motion.button>

            {showPlaylistMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPlaylistMenu(false);
                  }}
                />
                <div className="absolute right-0 bottom-10 w-48 rounded-xl bg-[#0B0E10]/98 backdrop-blur-xl border border-[#D8B86A]/20 p-1.5 shadow-2xl z-50 animate-fade-in flex flex-col gap-0.5">
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
                              : 'text-[#A4ADB2] hover:text-[#F6F1E7] hover:bg-white/5'
                          }`}
                        >
                          <span className="truncate">{playlist.name}</span>
                          {exists && <span className="text-[9px] uppercase tracking-wider font-bold">Added</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

            <motion.button
              onClick={() => setFullscreen(true)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              className="hover:text-[#F6F1E7] transition cursor-pointer hidden md:block"
              title="Lyrics & Fullscreen"
            >
              <Mic2 size={18} />
            </motion.button>

            {/* Volume control */}
            <div className="items-center gap-2 w-20 md:w-24 hidden sm:flex">
              <Volume2 size={16} />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-[#D8B86A] bg-[#1B2024] h-1 rounded-full cursor-pointer"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
