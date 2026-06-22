import { useState } from 'react';
import { Play, Heart, Music2, Clock, Sparkles, Plus, Trash2, ListMusic, Download } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { TrackCard } from '../components/TrackCard';
import { ImportPlaylistModal } from '../components/ImportPlaylistModal';
import { motion } from 'framer-motion';

export function Library() {
  const { playQueue } = usePlayerStore();
  const { favorites, recent, playlists, createPlaylist, deletePlaylist, removeTrackFromPlaylist } = useLibraryStore();
  const [activeTab, setActiveTab] = useState<'favorites' | 'playlists'>('favorites');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const handlePlayAll = () => {
    if (favorites.length > 0) {
      playQueue(favorites, 0);
    }
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
    }
  };

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-7xl mx-auto w-full">
      {/* Library Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-end gap-5 mb-8"
      >
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow-primary shrink-0 select-none">
          {activeTab === 'playlists' ? (
            <ListMusic size={32} className="text-white" />
          ) : (
            <Heart size={32} className="text-white fill-white" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={14} className="text-primary animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Personal Collection</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-text-primary tracking-tight">Your Library</h1>
          <p className="text-xs md:text-sm text-text-secondary mt-1">
            {activeTab === 'playlists' ? (
              `${playlists.length} custom playlist${playlists.length === 1 ? '' : 's'}`
            ) : (
              `${favorites.length} liked song${favorites.length === 1 ? '' : 's'}`
            )}
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex border-b border-glass-border mb-6">
        <button
          onClick={() => { setActiveTab('favorites'); setSelectedPlaylistId(null); }}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'favorites'
              ? 'text-primary border-primary'
              : 'text-text-muted border-transparent hover:text-text-secondary'
          }`}
        >
          Liked Songs
        </button>
        <button
          onClick={() => setActiveTab('playlists')}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'playlists'
              ? 'text-primary border-primary'
              : 'text-text-muted border-transparent hover:text-text-secondary'
          }`}
        >
          Playlists
        </button>
      </div>

      {activeTab === 'favorites' ? (
        <>
          {/* Action Bar */}
          {favorites.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <button
                onClick={handlePlayAll}
                className="bg-primary hover:bg-primary-light text-black font-extrabold px-6 py-3 rounded-full flex items-center gap-2 hover:scale-[1.03] transition-all shadow-lg cursor-pointer text-sm"
              >
                <Play size={16} className="fill-current" />
                <span>Play Liked Songs</span>
              </button>
            </motion.div>
          )}

          {/* Liked Songs List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-12"
          >
            {favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20 bg-surface/30 rounded-3xl border border-glass-border">
                <div className="w-16 h-16 rounded-full bg-surface-light flex items-center justify-center mb-4 text-text-muted">
                  <Music2 size={24} />
                </div>
                <p className="text-lg text-text-primary font-bold">No liked songs yet</p>
                <p className="text-xs text-text-secondary mt-1 max-w-xs leading-relaxed">
                  Tap the heart icon on any track to add it to your personal library.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 bg-surface/30 rounded-2xl p-2 border border-glass-border">
                {favorites.map((track, idx) => (
                  <TrackCard key={track.id + idx} track={track} index={idx} variant="list" contextTracks={favorites} contextStartIndex={idx} />
                ))}
              </div>
            )}
          </motion.div>
        </>
      ) : (
        <div className="mb-12">
          {!selectedPlaylistId ? (
            <>
              {/* Create Playlist Form */}
              <div className="flex flex-col sm:flex-row gap-2 mb-6">
                <form onSubmit={handleCreatePlaylist} className="flex gap-2 flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="New Playlist Name"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    className="flex-1 bg-surface-light border border-glass-border rounded-xl px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50"
                  />
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary-light text-black font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={16} /> Create
                  </button>
                </form>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="bg-surface-light hover:bg-surface-hover border border-glass-border text-text-secondary hover:text-text-primary font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download size={16} /> Import Playlist
                </button>
              </div>

              {/* Playlists Grid */}
              {playlists.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 bg-surface/30 rounded-3xl border border-glass-border">
                  <div className="w-16 h-16 rounded-full bg-surface-light flex items-center justify-center mb-4 text-text-muted">
                    <ListMusic size={24} />
                  </div>
                  <p className="text-lg text-text-primary font-bold">No playlists yet</p>
                  <p className="text-xs text-text-secondary mt-1 max-w-xs leading-relaxed">
                    Create a playlist above and add songs to it while browsing.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      onClick={() => setSelectedPlaylistId(playlist.id)}
                      className="p-5 rounded-2xl bg-surface/30 hover:bg-surface-hover border border-glass-border cursor-pointer transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-105 transition-transform">
                          <ListMusic size={24} />
                        </div>
                        <h3 className="font-bold text-lg text-text-primary truncate">{playlist.name}</h3>
                        <p className="text-xs text-text-secondary mt-1">{playlist.tracks.length} track{playlist.tracks.length === 1 ? '' : 's'}</p>
                      </div>
                      <div className="flex items-center justify-between mt-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (playlist.tracks.length > 0) {
                              playQueue(playlist.tracks, 0);
                            }
                          }}
                          disabled={playlist.tracks.length === 0}
                          className="bg-white hover:bg-neutral-200 text-black rounded-full p-2.5 shadow-md disabled:opacity-40 transition-all flex items-center justify-center cursor-pointer"
                        >
                          <Play size={16} className="fill-current ml-0.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePlaylist(playlist.id);
                          }}
                          className="text-text-muted hover:text-red-400 p-2 transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Detailed Playlist View */}
              <div className="mb-6">
                <button
                  onClick={() => setSelectedPlaylistId(null)}
                  className="text-sm font-semibold text-primary hover:text-primary-light transition-all mb-4 cursor-pointer"
                >
                  &larr; Back to Playlists
                </button>
                <div className="flex items-end gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <ListMusic size={28} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">{selectedPlaylist?.name}</h2>
                    <p className="text-xs text-text-secondary mt-0.5">{selectedPlaylist?.tracks.length} track{selectedPlaylist?.tracks.length === 1 ? '' : 's'}</p>
                  </div>
                  {selectedPlaylist && selectedPlaylist.tracks.length > 0 && (
                    <button
                      onClick={() => playQueue(selectedPlaylist.tracks, 0)}
                      className="bg-primary hover:bg-primary-light text-black font-extrabold px-6 py-2.5 rounded-full flex items-center gap-2 transition-all shadow-lg cursor-pointer text-sm"
                    >
                      <Play size={14} className="fill-current" /> Play Playlist
                    </button>
                  )}
                </div>
              </div>

              {selectedPlaylist?.tracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 bg-surface/30 rounded-3xl border border-glass-border">
                  <div className="w-16 h-16 rounded-full bg-surface-light flex items-center justify-center mb-4 text-text-muted">
                    <Music2 size={24} />
                  </div>
                  <p className="text-lg text-text-primary font-bold">No songs in this playlist</p>
                  <p className="text-xs text-text-secondary mt-1 max-w-xs leading-relaxed">
                    Search for tracks and add them using the '+' button on any track list.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 bg-surface/30 rounded-2xl p-2 border border-glass-border">
                  {selectedPlaylist?.tracks.map((track, idx) => (
                    <TrackCard
                      key={track.id + idx}
                      track={track}
                      index={idx}
                      variant="list"
                      contextTracks={selectedPlaylist.tracks}
                      contextStartIndex={idx}
                      onRemove={() => removeTrackFromPlaylist(selectedPlaylist.id, track.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Recently Played */}
      {recent.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-5">
            <Clock size={20} className="text-accent" />
            <h2 className="text-xl md:text-2xl font-bold text-text-primary">Recently Played</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recent.slice(0, 12).map((track, idx) => (
              <TrackCard key={track.id + idx} track={track} index={idx} variant="card" contextTracks={recent} contextStartIndex={idx} />
            ))}
          </div>
        </motion.div>
      )}
      {/* Import Playlist Modal */}
      <ImportPlaylistModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onPlaylistCreated={(id) => {
          setActiveTab('playlists');
          setSelectedPlaylistId(id);
        }}
      />
    </div>
  );
}
