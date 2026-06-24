import { create } from 'zustand';
import { API_URL } from '../config';
import { useLibraryStore } from './useLibraryStore';
import { fetchRecommendations } from '../lib/musicDiscovery';
import playerEngine from '../lib/playerEngine';
import useUIStore from './useUIStore';
import { getCache, setCache } from '../lib/playbackCache';

export type PlaybackStatus = 'IDLE' | 'LOADING' | 'READY' | 'PLAYING' | 'PAUSED' | 'BUFFERING' | 'ERROR';

export interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  url: string;
  videoId?: string;
  rawTitle?: string;
  version?: 'official' | 'topic' | 'lyrics' | 'alternative' | 'modified' | 'unknown';
  quality?: 'official' | 'topic' | 'user' | 'unknown';
  rankScore?: number;
  viewCount?: number;
  likeCount?: number;
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  history: Track[];
  playBlocked: boolean;
  playbackStatus: PlaybackStatus;
  isPlaying: boolean;
  volume: number;
  progress: number;
  isFullscreen: boolean;
  isLoading: boolean;
  streamUrl: string | null;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';

  playTrack: (track: Track) => void;
  playQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  pushHistory: (track: Track) => void;
  clearHistory: () => void;
  nextTrack: (options?: { auto?: boolean }) => void | Promise<void>;
  prevTrack: () => void;
  setPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setFullscreen: (isFullscreen: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setStreamUrl: (url: string | null) => void;
  setShuffle: (shuffle: boolean) => void;
  setRepeat: (repeat: 'off' | 'all' | 'one') => void;
  setPlayBlocked: (b: boolean) => void;
  setPlaybackStatus: (status: PlaybackStatus) => void;
  seek: (seconds: number) => void;
  shuffleQueue: () => void;
}

const startupSamples: number[] = [];
let playbackToken = 0;
let lastAutoAdvanceTrackId: string | null = null;
let lastManualNextAt = 0;

export function getAverageStartup() {
  if (startupSamples.length === 0) return 0;
  return Math.round(startupSamples.reduce((a, b) => a + b, 0) / startupSamples.length);
}

function recordStartup(ms: number) {
  startupSamples.push(ms);
  if (startupSamples.length > 100) startupSamples.shift();
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem('sumic_play_state');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function streamUrlFor(track: Track): string {
  return `${API_URL}/api/music/stream/${track.id}`;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function debugEnabled() {
  return localStorage.getItem('PLAYER_DEBUG') === 'true' || import.meta.env.VITE_PLAYER_DEBUG === 'true';
}

function debugPlayer(label: string, data?: Record<string, unknown>) {
  if (debugEnabled()) console.log(`[PLAYER_DEBUG] ${label}`, data || {});
}

function extractYouTubeId(track: Track) {
  if (track.videoId) return track.videoId;
  return String(track.url || '').match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)?.[1];
}

function prepareImmediatePlayback(track: Track, stream: string) {
  try {
    const isYT = !!(track.videoId || (track.url && /youtube\.com|youtu\.be/.test(String(track.url))));
    if (!isYT) {
      playerEngine.gestureLoad(track, stream);
      playerEngine.playSync?.();
      return true;
    }

    const vid = extractYouTubeId(track);
    if (vid && (playerEngine as any).gestureCueYouTube?.(vid)) {
      (playerEngine as any).playSync?.();
      return true;
    }

    playerEngine.prewarm().catch(() => {});
    playerEngine.load(track, stream)
      .then(() => playerEngine.play())
      .catch(() => {
        usePlayerStore.setState({ playBlocked: true });
        useUIStore.getState().addToast('Playback blocked - tap the player to start YouTube audio', 5000);
      });
    return false;
  } catch (e) {
    return false;
  }
}

async function startPlayback(track: Track, stream: string, opts: { retry?: boolean; source: string; prepared?: boolean }) {
  const token = ++playbackToken;
  lastAutoAdvanceTrackId = null;
  const startedAt = performance.now();
  usePlayerStore.setState({ playbackStatus: 'LOADING', isLoading: true, isPlaying: true, playBlocked: false });

  const waitForPlaying = new Promise<boolean>((resolve) => {
    let done = false;
    const onState = (st: string) => {
      if (st !== 'playing' || done) return;
      done = true;
      window.clearTimeout(timeout);
      playerEngine.off('statechange', onState);
      resolve(true);
    };
    const timeout = window.setTimeout(() => {
      if (done) return;
      done = true;
      playerEngine.off('statechange', onState);
      resolve(false);
    }, 5000);
    playerEngine.on('statechange', onState);
  });

  try {
    const loadStart = performance.now();
    if (!opts.prepared) {
      await playerEngine.load(track, stream);
      if (token !== playbackToken) return;
    }

    usePlayerStore.setState({ playbackStatus: 'READY' });
    await playerEngine.play();
    const didStart = await waitForPlaying;
    if (token !== playbackToken) return;

    if (!didStart && !(await playerEngine.isPlaying())) {
      throw new Error('Playback did not start within 5s');
    }

    const startupMs = performance.now() - startedAt;
    recordStartup(startupMs);
    usePlayerStore.setState({ isLoading: false, isPlaying: true, playbackStatus: 'PLAYING' });
    debugPlayer('startup', {
      source: opts.source,
      trackId: track.id,
      startupMs: Math.round(startupMs),
      playerLoadMs: Math.round(performance.now() - loadStart),
    });

    const dur = await playerEngine.getDuration();
    if (dur) {
      const s = usePlayerStore.getState();
      if (s.currentTrack?.id === track.id) {
        usePlayerStore.setState({ currentTrack: { ...s.currentTrack, duration: dur } });
      }
      setCache(track.id, {
        videoId: track.videoId || extractYouTubeId(track),
        duration: dur,
        thumbnail: track.thumbnail,
        capability: track.videoId ? 'youtube' : 'audio',
      });
    }
  } catch (e) {
    if (token !== playbackToken) return;
    debugPlayer('failure', { trackId: track.id, retry: !!opts.retry, error: e instanceof Error ? e.message : String(e) });
    if (!opts.retry) {
      useUIStore.getState().addToast('Playback stalled. Retrying once...', 3000);
      return startPlayback(track, stream, { ...opts, retry: true, prepared: false });
    }
    usePlayerStore.setState({ isLoading: false, isPlaying: false, playbackStatus: 'ERROR' });
    useUIStore.getState().addToast('Song could not start. Skipping...', 3500);
    await usePlayerStore.getState().nextTrack();
  }
}

function playNow(track: Track, source: string) {
  const stream = streamUrlFor(track);
  const prepared = prepareImmediatePlayback(track, stream);
  void startPlayback(track, stream, { source, prepared });
  useLibraryStore.getState().addRecent(track);
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  ...(() => {
    const p = loadPersistedState();
    return {
      currentTrack: p?.currentTrack || null,
      queue: p?.queue || [],
      history: p?.history || [],
      isPlaying: false,
      playbackStatus: 'IDLE',
      playBlocked: false,
      volume: Number(localStorage.getItem('sumic_volume') || (p?.volume != null ? String(p.volume) : '1')),
      progress: p?.progress || 0,
      shuffle: p?.shuffle || false,
      repeat: p?.repeat || 'off',
    } as any;
  })(),
  isFullscreen: false,
  isLoading: false,
  streamUrl: null,

  playTrack: (track) => {
    const stream = streamUrlFor(track);
    const state = get();
    const idx = state.queue.findIndex((t) => t.id === track.id);
    const current = state.currentTrack;

    if (current && current.id !== track.id) {
      set({ history: [...state.history, current] });
    }

    set({
      queue: idx >= 0 ? state.queue.slice(idx + 1) : [],
      currentTrack: track,
      streamUrl: stream,
      isPlaying: true,
      progress: 0,
      isLoading: true,
      playbackStatus: 'LOADING',
    });

    const cache = getCache(track.id);
    if (cache?.duration && !track.duration) {
      set({ currentTrack: { ...track, duration: cache.duration } });
    }
    playNow(track, 'playTrack');
  },

  playQueue: (tracks, startIndex = 0) => {
    const current = tracks[startIndex];
    if (!current) return;
    const stream = streamUrlFor(current);
    set((state) => ({
      history: [...state.history, ...tracks.slice(0, startIndex)],
      queue: tracks.slice(startIndex + 1),
      currentTrack: current,
      streamUrl: stream,
      isPlaying: true,
      progress: 0,
      isLoading: true,
      playbackStatus: 'LOADING',
    }));
    playNow(current, 'playQueue');
  },

  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  removeFromQueue: (index) => set((state) => ({ queue: state.queue.filter((_, i) => i !== index) })),
  clearQueue: () => set({ queue: [] }),
  pushHistory: (track) => set((state) => ({ history: [...state.history, track] })),
  clearHistory: () => set({ history: [] }),

  nextTrack: async (options = {}) => {
    if (!options.auto) {
      const now = Date.now();
      if (now - lastManualNextAt < 250) return;
      lastManualNextAt = now;
    }
    lastAutoAdvanceTrackId = null;

    const { queue, repeat, currentTrack } = get();

    if (options.auto && repeat === 'one' && currentTrack) {
      set({ progress: 0, isPlaying: true, isLoading: false });
      try {
        await playerEngine.seek(0);
        await playerEngine.play();
      } catch (e) {
        playNow(currentTrack, 'repeatOne');
      }
      return;
    }

    if (queue.length > 0) {
      const next = queue[0];
      const newQueue = queue.slice(1);
      if (repeat === 'all' && currentTrack) newQueue.push(currentTrack);
      const stream = streamUrlFor(next);
      set((state) => ({
        history: currentTrack ? [...state.history, currentTrack] : state.history,
        currentTrack: next,
        queue: newQueue,
        streamUrl: stream,
        isPlaying: true,
        progress: 0,
        isLoading: true,
        playbackStatus: 'LOADING',
      }));
      playNow(next, options.auto ? 'autoNext' : 'nextTrack');
      return;
    }

    if (repeat === 'all' && currentTrack) {
      const stream = streamUrlFor(currentTrack);
      set({ streamUrl: stream, isPlaying: true, progress: 0, isLoading: true, playbackStatus: 'LOADING' });
      playNow(currentTrack, options.auto ? 'repeatAll' : 'nextTrackRepeatAll');
      return;
    }

    if (!currentTrack) {
      set({ currentTrack: null, isPlaying: false, progress: 0, streamUrl: null, isLoading: false, playbackStatus: 'IDLE' });
      return;
    }

    const currentTrackId = currentTrack.id;
    const recommendations = await fetchRecommendations(currentTrack, useLibraryStore.getState().recent);
    if (get().currentTrack?.id !== currentTrackId) return;

    const [next, ...remaining] = recommendations;
    if (next) {
      const stream = streamUrlFor(next);
      set((state) => ({
        history: [...state.history, currentTrack],
        currentTrack: next,
        queue: remaining,
        streamUrl: stream,
        isPlaying: true,
        progress: 0,
        isLoading: true,
        playbackStatus: 'LOADING',
      }));
      playNow(next, 'recommendations');
      return;
    }

    set({ currentTrack: null, isPlaying: false, progress: 0, streamUrl: null, isLoading: false, playbackStatus: 'IDLE' });
  },

  prevTrack: () => {
    const { history, currentTrack, queue, progress } = get();
    if (progress > 3) {
      set({ progress: 0 });
      void playerEngine.seek(0);
      return;
    }

    const prev = history[history.length - 1];
    if (!prev) {
      set({ progress: 0 });
      void playerEngine.seek(0);
      return;
    }

    const stream = streamUrlFor(prev);
    set({
      history: history.slice(0, -1),
      queue: currentTrack ? [currentTrack, ...queue] : queue,
      currentTrack: prev,
      streamUrl: stream,
      isPlaying: true,
      progress: 0,
      isLoading: true,
      playbackStatus: 'LOADING',
    });
    playNow(prev, 'prevTrack');
  },

  setPlaying: (isPlaying) => {
    const state = get();
    if (isPlaying && state.currentTrack && (state.playbackStatus === 'IDLE' || state.playbackStatus === 'ERROR')) {
      const stream = streamUrlFor(state.currentTrack);
      set({
        streamUrl: stream,
        isPlaying: true,
        isLoading: true,
        playbackStatus: 'LOADING',
        playBlocked: false,
      });
      const prepared = prepareImmediatePlayback(state.currentTrack, stream);
      void startPlayback(state.currentTrack, stream, { source: 'resumeAfterRefresh', prepared });
      useLibraryStore.getState().addRecent(state.currentTrack);
      return;
    }

    set({ isPlaying, playbackStatus: isPlaying ? 'PLAYING' : 'PAUSED' });
    void (async () => {
      try {
        if (isPlaying) await playerEngine.play();
        else await playerEngine.pause();
      } catch (e) {
        console.error('setPlaying engine error', e);
        const latest = get();
        if (isPlaying && latest.currentTrack) {
          const stream = streamUrlFor(latest.currentTrack);
          const prepared = prepareImmediatePlayback(latest.currentTrack, stream);
          void startPlayback(latest.currentTrack, stream, { source: 'playFallback', prepared });
        }
      }
    })();
  },
  setVolume: (volume) => {
    set({ volume });
    try { localStorage.setItem('sumic_volume', String(volume)); } catch (e) {}
    void playerEngine.setVolume(volume).catch(() => {});
  },
  setProgress: (progress) => set({ progress }),
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
  setLoading: (isLoading) => set({ isLoading }),
  setStreamUrl: (url) => set({ streamUrl: url }),
  setShuffle: (shuffle) => set({ shuffle }),
  setRepeat: (repeat) => set({ repeat }),
  setPlayBlocked: (playBlocked) => set({ playBlocked }),
  setPlaybackStatus: (playbackStatus) => set({ playbackStatus }),
  seek: (seconds) => {
    set({ progress: seconds });
    void playerEngine.seek(seconds).catch(() => {});
  },
  shuffleQueue: () => set((state) => ({ queue: shuffleArray(state.queue) })),
}));

let rafProgress = 0;
let pendingProgress = 0;

playerEngine.on('timeupdate', (t: number) => {
  pendingProgress = Number(t || 0);
  if (rafProgress) return;
  rafProgress = window.requestAnimationFrame(() => {
    rafProgress = 0;
    try {
      usePlayerStore.setState({ progress: pendingProgress });
      const s = usePlayerStore.getState();
      const duration = Number(s.currentTrack?.duration || 0);
      const trackId = s.currentTrack?.id || null;
      if (trackId && s.isPlaying && duration > 5 && pendingProgress >= duration - 0.75 && lastAutoAdvanceTrackId !== trackId) {
        lastAutoAdvanceTrackId = trackId;
        void s.nextTrack({ auto: true });
      }
    } catch (e) {}
  });
});

playerEngine.on('statechange', (st: string) => {
  try {
    const status: PlaybackStatus =
      st === 'playing' ? 'PLAYING' :
      st === 'paused' ? 'PAUSED' :
      st === 'buffering' ? 'BUFFERING' :
      st === 'ended' ? 'IDLE' :
      usePlayerStore.getState().playbackStatus;
    usePlayerStore.setState({ isPlaying: st === 'playing', playbackStatus: status });

    if (st === 'ended') {
      const s = usePlayerStore.getState();
      const trackId = s.currentTrack?.id || null;
      if (trackId && lastAutoAdvanceTrackId === trackId) return;
      lastAutoAdvanceTrackId = trackId;
      void s.nextTrack({ auto: true });
    }
  } catch (e) {}
});

playerEngine.on('durationchange', (d: number) => {
  try {
    const s = usePlayerStore.getState();
    if (s.currentTrack && (!s.currentTrack.duration || s.currentTrack.duration === 0)) {
      usePlayerStore.setState({ currentTrack: { ...s.currentTrack, duration: Number(d || 0) } });
    }
  } catch (e) {}
});

playerEngine.on('volumechange', (v: number) => {
  try { usePlayerStore.setState({ volume: Number(v || 0) }); } catch (e) {}
});

usePlayerStore.subscribe((s) => {
  try {
    localStorage.setItem('sumic_play_state', JSON.stringify({
      queue: s.queue,
      currentTrack: s.currentTrack,
      history: s.history,
      progress: s.progress,
      volume: s.volume,
      repeat: s.repeat,
      shuffle: s.shuffle,
    }));
  } catch (e) {}
});

(() => {
  try {
    const s = usePlayerStore.getState();
    const cur = s.currentTrack;
    if (!cur) return;
    const stream = streamUrlFor(cur);
    usePlayerStore.setState({ streamUrl: stream, playbackStatus: 'READY', isPlaying: false, isLoading: false });
    void (async () => {
      try {
        await playerEngine.load(cur, stream);
        if (s.progress > 0) await playerEngine.seek(s.progress);
      } catch (e) {}
    })();
  } catch (e) {}
})();
