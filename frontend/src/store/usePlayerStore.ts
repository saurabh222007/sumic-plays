import { create } from 'zustand';
import { useLibraryStore } from './useLibraryStore';
import { fetchRecommendations } from '../lib/musicDiscovery';

export interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  url: string;
  rawTitle?: string;
  version?: 'official' | 'topic' | 'lyrics' | 'alternative' | 'modified' | 'unknown';
  quality?: 'official' | 'topic' | 'user' | 'unknown';
  rankScore?: number;
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  volume: number;
  progress: number;
  isFullscreen: boolean;
  isLoading: boolean;
  streamUrl: string | null;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  audioElement: HTMLAudioElement | null;

  playTrack: (track: Track) => void;
  playQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  nextTrack: () => void | Promise<void>;
  prevTrack: () => void;
  setPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setFullscreen: (isFullscreen: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setStreamUrl: (url: string | null) => void;
  setShuffle: (shuffle: boolean) => void;
  setRepeat: (repeat: 'off' | 'all' | 'one') => void;
  setAudioElement: (el: HTMLAudioElement | null) => void;
  shuffleQueue: () => void;
}

function streamUrlFor(track: Track): string {
  return `http://localhost:5000/api/music/stream/${track.id}`;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  volume: 1,
  progress: 0,
  isFullscreen: false,
  isLoading: false,
  streamUrl: null,
  shuffle: false,
  repeat: 'off',
  audioElement: null,

  playTrack: (track) => {
    set({ queue: [], currentTrack: track, streamUrl: streamUrlFor(track), isPlaying: true, progress: 0, isLoading: false });
    useLibraryStore.getState().addRecent(track);
  },

  playQueue: (tracks, startIndex = 0) => {
    if (tracks.length === 0) return;
    const current = tracks[startIndex];
    if (!current) return;
    const remaining = [...tracks.slice(0, startIndex), ...tracks.slice(startIndex + 1)];
    set({ queue: remaining, currentTrack: current, streamUrl: streamUrlFor(current), isPlaying: true, progress: 0, isLoading: false });
    useLibraryStore.getState().addRecent(current);
  },

  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  removeFromQueue: (index) => set((state) => ({ queue: state.queue.filter((_, i) => i !== index) })),
  clearQueue: () => set({ queue: [] }),

  nextTrack: async () => {
    const { queue, repeat, currentTrack } = get();

    if (repeat === 'one' && currentTrack) {
      set({ progress: 0, streamUrl: streamUrlFor(currentTrack), isPlaying: true, isLoading: false });
      return;
    }

    if (queue.length > 0) {
      const next = queue[0];
      if (!next) return;
      const newQueue = queue.slice(1);
      if (repeat === 'all' && currentTrack) {
        newQueue.push(currentTrack);
      }
      set({ currentTrack: next, queue: newQueue, streamUrl: streamUrlFor(next), isPlaying: true, progress: 0, isLoading: false });
      useLibraryStore.getState().addRecent(next);
      return;
    }

    if (repeat === 'all' && currentTrack) {
      set({ currentTrack, queue: [], streamUrl: streamUrlFor(currentTrack), isPlaying: true, progress: 0, isLoading: false });
      return;
    }

    if (!currentTrack) {
      set({ currentTrack: null, isPlaying: false, progress: 0, streamUrl: null, isLoading: false });
      return;
    }

    const currentTrackId = currentTrack.id;
    const recent = useLibraryStore.getState().recent;
    const recommendations = await fetchRecommendations(currentTrack, recent);

    if (get().currentTrack?.id !== currentTrackId) return;

    const [next, ...remaining] = recommendations;
    if (next) {
      set({ currentTrack: next, queue: remaining, streamUrl: streamUrlFor(next), isPlaying: true, progress: 0, isLoading: false });
      useLibraryStore.getState().addRecent(next);
      return;
    }

    set({ currentTrack: null, isPlaying: false, progress: 0, streamUrl: null, isLoading: false });
  },

  prevTrack: () => {
    const { progress, audioElement } = get();
    if (progress > 3 && audioElement) {
      audioElement.currentTime = 0;
      set({ progress: 0 });
    } else {
      set({ progress: 0 });
    }
  },

  setPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
  setLoading: (isLoading) => set({ isLoading }),
  setStreamUrl: (url) => set({ streamUrl: url }),
  setShuffle: (shuffle) => set({ shuffle }),
  setRepeat: (repeat) => set({ repeat }),
  setAudioElement: (el) => set({ audioElement: el }),

  shuffleQueue: () => {
    set((state) => ({ queue: shuffleArray(state.queue) }));
  },
}));
