import { create } from 'zustand';

export interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  url: string; 
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  volume: number;
  progress: number;
  playTrack: (track: Track) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  volume: 1,
  progress: 0,
  playTrack: (track) => set({ currentTrack: track, isPlaying: true }),
  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  removeFromQueue: (index) => set((state) => ({ queue: state.queue.filter((_, i) => i !== index) })),
  nextTrack: () => {
    const { queue } = get();
    if (queue.length > 0) {
      const next = queue[0];
      set({ currentTrack: next, queue: queue.slice(1), isPlaying: true, progress: 0 });
    } else {
      set({ currentTrack: null, isPlaying: false, progress: 0 });
    }
  },
  prevTrack: () => {
    set({ progress: 0 }); // Simplistic prevTrack logic
  },
  setPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
}));
