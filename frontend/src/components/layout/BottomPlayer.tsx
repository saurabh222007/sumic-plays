import { useEffect, useRef, useState } from 'react';
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
    streamUrl,
    isLoading,
    shuffle,
    repeat,
    queue,
    setPlaying,
    setProgress,
    nextTrack,
    prevTrack,
    setVolume,
    setFullscreen,
    setShuffle,
    setRepeat,
    setAudioElement,
    clearQueue,
  } = usePlayerStore();

  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const { favorites, addFavorite, removeFavorite, playlists, addTrackToPlaylist, removeTrackFromPlaylist } = useLibraryStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isLiked = !!currentTrack && favorites.some((t) => t.id === currentTrack.id);
  const currentTitle = currentTrack ? getTrackTitle(currentTrack) : '';

  // Sync audio element ref to store
  useEffect(() => {
    if (audioRef.current) {
      setAudioElement(audioRef.current);
    }
    return () => {
      setAudioElement(null);
    };
  }, [setAudioElement]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying && streamUrl) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .catch((e) => {
            console.error('Playback failed:', e);
            // Try to reload if it was a network error
            if (e.name === 'NotSupportedError' || e.name === 'NotAllowedError') {
              console.log('Trying to resume playback...');
              setTimeout(() => {
                audioRef.current?.play().catch(() => {});
              }, 500);
            }
          });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, streamUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
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
    if (audioRef.current && currentTrack.duration) {
      const bounds = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - bounds.left) / bounds.width;
      audioRef.current.currentTime = percent * currentTrack.duration;
      setProgress(audioRef.current.currentTime);
    }
  };

  const progressPercent = currentTrack.duration ? (progress / currentTrack.duration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="h-20 bg-[#0A0A0F]/90 backdrop-blur-xl border-t border-glass-border flex flex-col justify-between fixed bottom-[58px] md:bottom-0 left-0 right-0 z-40 select-none gpu-accelerated"
      >
        {/* Top Full Width Progress Bar */}
        <div
          className="h-1 bg-surface-hover w-full relative group cursor-pointer"
          onClick={handleProgressClick}
        >
          <motion.div
            className="h-full bg-primary absolute left-0 top-0 group-hover:bg-primary-light"
            style={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
          <motion.div
            className="w-3 h-3 rounded-full bg-white absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
            style={{ left: `calc(${progressPercent}% - 6px)` }}
            transition={{ duration: 0.15 }}
          />
        </div>

        <audio
          ref={audioRef}
          src={streamUrl || undefined}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={(e) => {
            console.error('Audio element error:', e.currentTarget.error?.message);
          }}
          onCanPlay={() => {
            console.log('Audio can play');
            if (isPlaying && audioRef.current) {
              audioRef.current.play().catch((e) => console.error('Play after canplay failed:', e));
            }
          }}
          controlsList="nodownload"
        />

        <div className="flex-1 flex items-center justify-between px-4">
          {/* Left: Track Info */}
          <motion.div
            className="flex items-center gap-3 w-1/3 min-w-[150px] cursor-pointer group"
            onClick={() => setFullscreen(true)}
            whileTap={{ scale: 0.97 }}
          >
            <div className={`relative w-11 h-11 shrink-0 rounded-lg overflow-hidden shadow-md ${isPlaying ? 'animate-playing-pulse' : ''}`}>
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
                className="text-text-primary text-xs md:text-sm font-semibold truncate hover:text-primary transition-colors"
              >
                {currentTitle}
              </motion.span>
              <motion.span
                key={currentTrack.id + '-artist'}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="text-text-secondary text-[10px] md:text-xs truncate"
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
                  shuffle ? 'text-primary' : 'text-text-muted hover:text-text-secondary'
                }`}
                title="Shuffle"
              >
                <Shuffle size={16} />
              </motion.button>

              <motion.button
                onClick={prevTrack}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.8 }}
                className="text-text-secondary hover:text-text-primary transition cursor-pointer"
              >
                <SkipBack size={18} className="fill-current" />
              </motion.button>

              <motion.button
                onClick={togglePlay}
                disabled={isLoading || !streamUrl}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.88 }}
                className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-md disabled:opacity-75 cursor-pointer"
              >
                <AnimatePresence mode="wait">
                  {isLoading ? (
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
                onClick={nextTrack}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.8 }}
                className="text-text-secondary hover:text-text-primary transition cursor-pointer"
              >
                <SkipForward size={18} className="fill-current" />
              </motion.button>

              <motion.button
                onClick={cycleRepeat}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
                className={`transition cursor-pointer hidden md:block relative ${
                  repeat !== 'off' ? 'text-primary' : 'text-text-muted hover:text-text-secondary'
                }`}
                title={`Repeat: ${repeat}`}
              >
                <Repeat size={16} />
                {repeat === 'one' && <span className="absolute text-[8px] font-bold -top-1.5 -right-1.5">1</span>}
              </motion.button>
            </div>

            {/* Time indicator */}
            <div className="flex items-center gap-2 text-[10px] text-text-secondary">
              <span>{formatTime(progress)}</span>
              <span>/</span>
              <span>{formatTime(currentTrack.duration)}</span>
            </div>
          </div>

          {/* Right: Extra Controls */}
          <div className="flex items-center justify-end w-1/3 gap-3 md:gap-4 min-w-[120px] text-text-secondary">
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
            className="cursor-pointer p-1 text-text-secondary"
            title="Like song"
          >
            <Heart size={18} className={isLiked ? 'fill-primary text-primary' : 'hover:text-text-primary'} />
          </motion.button>

          <div className="relative shrink-0 flex items-center">
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                setShowPlaylistMenu(!showPlaylistMenu);
              }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.8 }}
              className={`cursor-pointer p-1 transition-colors ${showPlaylistMenu ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}
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
                <div className="absolute right-0 bottom-10 w-48 rounded-xl bg-[#0A0A0F]/95 backdrop-blur-xl border border-glass-border p-1.5 shadow-2xl z-50 animate-fade-in flex flex-col gap-0.5">
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
                              ? 'text-primary bg-primary/10 hover:bg-primary/20' 
                              : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
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
              className="hover:text-text-primary transition cursor-pointer hidden md:block"
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
                className="w-full accent-primary bg-surface-hover h-1 rounded-full cursor-pointer"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
