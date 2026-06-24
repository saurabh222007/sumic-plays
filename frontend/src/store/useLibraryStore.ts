import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track } from './usePlayerStore';

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

interface LibraryState {
  favorites: Track[];
  playlists: Playlist[];
  recent: Track[];
  addFavorite: (track: Track) => void;
  removeFavorite: (trackId: string) => void;
  createPlaylist: (name: string, tracks?: Track[]) => string;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  addRecent: (track: Track) => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      favorites: [],
      playlists: [],
      recent: [],
      addFavorite: (track) => set((state) => ({ favorites: [...state.favorites, track] })),
      removeFavorite: (trackId) => set((state) => ({
        favorites: state.favorites.filter((t) => t.id !== trackId),
      })),
      createPlaylist: (name, tracks = []) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        set((state) => ({
          playlists: [...state.playlists, { id, name, tracks }],
        }));
        return id;
      },
      deletePlaylist: (id) => set((state) => ({
        playlists: state.playlists.filter((p) => p.id !== id),
      })),
      addTrackToPlaylist: (playlistId, track) => set((state) => ({
        playlists: state.playlists.map((p) => 
          p.id === playlistId ? { ...p, tracks: [...p.tracks.filter((t) => t.id !== track.id), track] } : p
        )
      })),
      removeTrackFromPlaylist: (playlistId, trackId) => set((state) => ({
        playlists: state.playlists.map((p) => 
          p.id === playlistId ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) } : p
        )
      })),
      addRecent: (track) => set((state) => {
        const filtered = state.recent.filter((t) => t.id !== track.id);
        return { recent: [track, ...filtered].slice(0, 50) };
      }),
    }),
    {
      name: 'sumic-library-storage',
    }
  )
);
