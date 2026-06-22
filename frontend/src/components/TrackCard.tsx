import { useState } from 'react';
import { Play, Heart, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePlayerStore, type Track } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { getTrackTitle } from '../lib/musicDiscovery';

interface TrackCardProps {
  track: Track;
  index?: number;
  variant?: 'card' | 'compact' | 'list';
  showArtist?: boolean;
  contextTracks?: Track[];
  contextStartIndex?: number;
  onRemove?: () => void;
}

export function TrackCard({ track, index = 0, variant = 'card', showArtist = true, contextTracks, contextStartIndex = 0, onRemove }: TrackCardProps) {
  const { playTrack, playQueue, currentTrack, isPlaying } = usePlayerStore();
  const { addRecent, favorites, addFavorite, removeFavorite, playlists, addTrackToPlaylist, removeTrackFromPlaylist } = useLibraryStore();
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const isLiked = favorites.some(t => t.id === track.id);
  const isCurrentlyPlaying = currentTrack?.id === track.id;
  const displayTitle = getTrackTitle(track);

  const handlePlay = () => {
    if (contextTracks && contextTracks.length > 1) {
      playQueue(contextTracks, contextStartIndex);
    } else {
      playTrack(track);
    }
    addRecent(track);
  };

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiked) {
      removeFavorite(track.id);
    } else {
      addFavorite(track);
    }
  };

  const formatDuration = (dur: number) => {
    if (!dur) return '';
    const m = Math.floor(dur / 60);
    const s = Math.floor(dur % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (variant === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03, type: 'spring', damping: 20, stiffness: 200 }}
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
        whileTap={{ scale: 0.98 }}
        className={`flex items-center gap-3 p-2.5 rounded-xl group transition-colors cursor-pointer gpu-accelerated relative ${
          showPlaylistMenu ? 'z-30 bg-white/5 shadow-lg' : ''
        }`}
        onClick={handlePlay}
      >
        <div className={`relative w-11 h-11 shrink-0 rounded-lg overflow-hidden ${isCurrentlyPlaying && isPlaying ? 'animate-playing-pulse' : ''}`}>
          <img src={track.thumbnail} alt={displayTitle} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {isCurrentlyPlaying && isPlaying ? (
              <div className="audio-bars"><span /><span /><span /><span /></div>
            ) : (
              <Play size={16} className="text-white fill-current" />
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${isCurrentlyPlaying ? 'text-primary' : 'text-text-primary'}`}>{displayTitle}</p>
          {showArtist && <p className="text-xs text-text-secondary truncate">{track.artist}</p>}
        </div>
        <span className="text-[10px] text-text-muted font-medium tabular-nums shrink-0 mr-1">{formatDuration(track.duration)}</span>
        {onRemove ? (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            whileHover={{ scale: 1.2, color: '#f87171' }}
            whileTap={{ scale: 0.8 }}
            className="shrink-0 p-1.5 rounded-full text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove from playlist"
          >
            <Trash2 size={14} />
          </motion.button>
        ) : (
          <div className="flex items-center gap-1">
            <motion.button
              onClick={toggleLike}
              whileHover={{ scale: 1.3 }}
              whileTap={{ scale: 0.7 }}
              className={`shrink-0 p-1.5 rounded-full transition-opacity ${isLiked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <Heart size={14} className={isLiked ? 'fill-primary text-primary' : 'text-text-muted hover:text-text-secondary'} />
            </motion.button>

            <div className="relative shrink-0">
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPlaylistMenu(!showPlaylistMenu);
                }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.8 }}
                className={`p-1.5 rounded-full text-text-muted hover:text-text-secondary transition-opacity ${
                  showPlaylistMenu ? 'opacity-100 text-primary' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'
                }`}
                title="Add to Playlist"
              >
                <Plus size={14} />
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
                  <div className="absolute right-0 top-8 w-48 rounded-xl bg-[#0A0A0F]/95 backdrop-blur-xl border border-glass-border p-1.5 shadow-2xl z-50 animate-fade-in flex flex-col gap-0.5">
                    <p className="text-[10px] font-bold text-text-muted px-2.5 py-1.5 uppercase tracking-wider select-none">Add to playlist</p>
                    {playlists.length === 0 ? (
                      <p className="text-xs text-text-secondary px-2.5 py-1.5 italic">No playlists found</p>
                    ) : (
                      playlists.map((playlist) => {
                        const exists = playlist.tracks.some(t => t.id === track.id);
                        return (
                          <button
                            key={playlist.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (exists) {
                                removeTrackFromPlaylist(playlist.id, track.id);
                              } else {
                                addTrackToPlaylist(playlist.id, track);
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
          </div>
        )}
      </motion.div>
    );
  }

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, type: 'spring', damping: 20, stiffness: 200 }}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.97 }}
        className={`flex items-center gap-3 p-2 rounded-xl bg-surface/50 hover:bg-surface-hover group transition-all cursor-pointer min-w-[200px] gpu-accelerated ${isCurrentlyPlaying ? 'ring-1 ring-primary/40' : ''}`}
        onClick={handlePlay}
      >
        <div className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 ${isCurrentlyPlaying && isPlaying ? 'animate-playing-pulse' : ''}`}>
          <img src={track.thumbnail} alt={displayTitle} className="w-full h-full object-cover" />
          {isCurrentlyPlaying && isPlaying && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="audio-bars"><span /><span /><span /><span /></div>
            </div>
          )}
        </div>
        <span className={`font-semibold text-sm truncate flex-1 ${isCurrentlyPlaying ? 'text-primary' : 'text-text-primary'}`}>{displayTitle}</span>
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          className="ml-auto shrink-0 bg-primary rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
        >
          <Play size={14} className="text-black fill-current ml-0.5" />
        </motion.button>
      </motion.div>
    );
  }

  // Default card variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', damping: 20, stiffness: 180 }}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      className={`group cursor-pointer w-[160px] md:w-[180px] shrink-0 gpu-accelerated ${isCurrentlyPlaying ? 'ring-2 ring-primary/30 rounded-xl' : ''}`}
      onClick={handlePlay}
    >
      <div className={`relative aspect-square rounded-xl overflow-hidden mb-3 shadow-card ${isCurrentlyPlaying && isPlaying ? 'animate-playing-pulse' : ''}`}>
        <img
          src={track.thumbnail}
          alt={displayTitle}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Audio bars for currently playing */}
        {isCurrentlyPlaying && isPlaying && (
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
            <div className="audio-bars"><span /><span /><span /><span /></div>
          </div>
        )}

        <motion.button
          initial={false}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          className="absolute bottom-2 right-2 bg-primary rounded-full p-3 shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
          onClick={(e) => { e.stopPropagation(); handlePlay(); }}
        >
          <Play size={16} className="text-black fill-current ml-0.5" />
        </motion.button>
        <motion.button
          onClick={toggleLike}
          whileHover={{ scale: 1.3 }}
          whileTap={{ scale: 0.7 }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart size={14} className={isLiked ? 'fill-primary text-primary' : 'text-white/70'} />
        </motion.button>
      </div>
      <h3 className={`font-semibold text-sm truncate ${isCurrentlyPlaying ? 'text-primary' : 'text-text-primary'}`}>{displayTitle}</h3>
      {showArtist && (
        <p className="text-xs text-text-secondary truncate mt-0.5">{track.artist}</p>
      )}
    </motion.div>
  );
}
