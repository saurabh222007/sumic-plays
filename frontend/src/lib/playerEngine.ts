type Callback = (...args: any[]) => void;

interface IPlayer {
  load(track: any, streamUrl?: string): Promise<void>;
  play(): Promise<void>;
  playSync?(): void;
  pause(): Promise<void>;
  seek(seconds: number): Promise<void>;
  setVolume(v: number): Promise<void>;
  getCurrentTime(): Promise<number>;
  getDuration(): Promise<number>;
  isPlaying(): Promise<boolean>;
  on(event: string, cb: Callback): void;
  off(event: string, cb?: Callback): void;
  destroy(): void;
}

function emitTo(list: Set<Callback>, ...args: any[]) {
  for (const cb of Array.from(list)) cb(...args);
}

// Utility: load YouTube IFrame API
function loadYouTubeAPI(): Promise<void> {
  if ((window as any).YT && (window as any).YT.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const existing = document.getElementById('yt-iframe-api');
    if (existing) {
      (window as any).onYouTubeIframeAPIReady = () => resolve();
      return;
    }
    const tag = document.createElement('script');
    tag.id = 'yt-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    (window as any).onYouTubeIframeAPIReady = () => resolve();
    document.body.appendChild(tag);
  });
}

class AudioAdapter implements IPlayer {
  private audio: HTMLAudioElement;
  private events: { [k: string]: Set<Callback> } = {} as any;

  constructor() {
    this.audio = document.createElement('audio');
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';
    this.audio.style.display = 'none';
    document.body.appendChild(this.audio);

    // Throttle audio timeupdate emissions to avoid excessive re-renders
    let lastAudioEmit = 0;
    this.audio.addEventListener('timeupdate', () => {
      const now = Date.now();
      if (now - lastAudioEmit > 300) {
        lastAudioEmit = now;
        emitTo(this.events['timeupdate'] || new Set(), this.audio.currentTime);
      }
    });
    this.audio.addEventListener('play', () => emitTo(this.events['statechange'] || new Set(), 'playing'));
    this.audio.addEventListener('pause', () => emitTo(this.events['statechange'] || new Set(), 'paused'));
    this.audio.addEventListener('ended', () => emitTo(this.events['statechange'] || new Set(), 'ended'));
    this.audio.addEventListener('durationchange', () => emitTo(this.events['durationchange'] || new Set(), this.audio.duration));
    this.audio.addEventListener('volumechange', () => emitTo(this.events['volumechange'] || new Set(), this.audio.volume));
  }

  // Synchronously set src during a user gesture so play() can be called in the same event
  setSrcSync(src: string) {
    try {
      this.audio.src = src;
      try { this.audio.load(); } catch (e) {}
    } catch (e) {}
  }

  async load(track: any, streamUrl?: string) {
    this.audio.src = streamUrl || String(track.url || '');
    try {
      // emit ready when metadata loaded
      const onMeta = () => {
        this.audio.removeEventListener('loadedmetadata', onMeta);
        emitTo(this.events['ready'] || new Set(), { duration: this.audio.duration });
      };
      this.audio.addEventListener('loadedmetadata', onMeta);
      // start loading
      try { this.audio.load(); } catch (e) {}
    } catch (e) {}
  }
  async play() { try { await this.audio.play(); emitTo(this.events['statechange'] || new Set(), 'playing'); } catch(e) { throw e; } }
  playSync() { try { this.audio.play().catch(() => {}); } catch(e) { } }
  async pause() { this.audio.pause(); emitTo(this.events['statechange'] || new Set(), 'paused'); }
  async seek(seconds: number) { this.audio.currentTime = seconds; }
  async setVolume(v: number) { this.audio.volume = v; emitTo(this.events['volumechange'] || new Set(), this.audio.volume); }
  async getCurrentTime() { return this.audio.currentTime || 0; }
  async getDuration() { return this.audio.duration || 0; }
  async isPlaying() { return !this.audio.paused && !this.audio.ended; }
  on(event: string, cb: Callback) { if (!this.events[event]) this.events[event] = new Set(); this.events[event].add(cb); }
  off(event: string, cb?: Callback) { if (!this.events[event]) return; if (!cb) this.events[event].clear(); else this.events[event].delete(cb); }
  destroy() { try { this.audio.pause(); this.audio.src = ''; this.audio.remove(); } catch(e) {} }
}

class YouTubeAdapter implements IPlayer {
  private static sharedPlayer: any = null;
  private static sharedContainer: HTMLDivElement | null = null;
  private static sharedEvents: { [k: string]: Set<Callback> } = {
    ready: new Set(),
    statechange: new Set(),
    timeupdate: new Set(),
    durationchange: new Set(),
    volumechange: new Set(),
  };
  private events: { [k: string]: Set<Callback> } = {} as any;
  private videoId: string | null = null;
  private polling: number | null = null;
  private sharedHandlers: { [k: string]: Callback } = {} as any;

  static async ensureShared() {
    if (YouTubeAdapter.sharedPlayer) return;
    await loadYouTubeAPI();
    if (!YouTubeAdapter.sharedContainer) {
      YouTubeAdapter.sharedContainer = document.createElement('div');
      YouTubeAdapter.sharedContainer.id = 'yt-shared-player';
      YouTubeAdapter.sharedContainer.style.width = '0px';
      YouTubeAdapter.sharedContainer.style.height = '0px';
      YouTubeAdapter.sharedContainer.style.overflow = 'hidden';
      YouTubeAdapter.sharedContainer.style.position = 'absolute';
      YouTubeAdapter.sharedContainer.style.left = '-9999px';
      document.body.appendChild(YouTubeAdapter.sharedContainer);
    }
    YouTubeAdapter.sharedPlayer = new (window as any).YT.Player(YouTubeAdapter.sharedContainer, {
      height: '0',
      width: '0',
      videoId: '',
      playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0, playsinline: 1 },
      events: {
        onReady: (e: any) => {
          emitTo(YouTubeAdapter.sharedEvents['ready'], e);
        },
        onStateChange: (e: any) => {
          try {
            const YT = (window as any).YT;
            let stateStr = 'unknown';
            if (e && typeof e.data !== 'undefined') {
              if (e.data === YT.PlayerState.PLAYING) stateStr = 'playing';
              else if (e.data === YT.PlayerState.PAUSED) stateStr = 'paused';
              else if (e.data === YT.PlayerState.ENDED) stateStr = 'ended';
              else if (e.data === YT.PlayerState.BUFFERING) stateStr = 'buffering';
            }
            emitTo(YouTubeAdapter.sharedEvents['statechange'], stateStr);
          } catch (err) {}
        },
      }
    });
    console.log('[YouTubeAdapter] shared player created');
  }

  async load(track: any, _streamUrl?: string) {
    this.videoId = track.videoId || (track.url && String(track.url).match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1]) || null;
    if (!this.videoId) throw new Error('No videoId for YouTube adapter');
    await YouTubeAdapter.ensureShared();

    // Forward shared events into this adapter's event sets
    const mapEvents = ['ready', 'statechange', 'timeupdate', 'durationchange', 'volumechange'];
    for (const ev of mapEvents) {
      if (this.sharedHandlers[ev]) {
        try { YouTubeAdapter.sharedEvents[ev].delete(this.sharedHandlers[ev]); } catch (e) {}
      }
      const handler = (...args: any[]) => emitTo(this.events[ev] || new Set(), ...args);
      YouTubeAdapter.sharedEvents[ev].add(handler);
      this.sharedHandlers[ev] = handler;
    }

    // Start polling for time/duration
    this.startPolling();

    // cue video into shared player (non-blocking)
    try {
      YouTubeAdapter.sharedPlayer.cueVideoById(this.videoId);
      emitTo(this.events['ready'] || new Set(), { id: this.videoId });
    } catch (e) {
      console.warn('YouTubeAdapter cueVideoById failed', e);
    }
  }

  gestureLoadById(videoId: string) {
    this.videoId = videoId;
    if (!YouTubeAdapter.sharedPlayer) return false;

    const mapEvents = ['ready', 'statechange', 'timeupdate', 'durationchange', 'volumechange'];
    for (const ev of mapEvents) {
      if (this.sharedHandlers[ev]) continue;
      const handler = (...args: any[]) => emitTo(this.events[ev] || new Set(), ...args);
      YouTubeAdapter.sharedEvents[ev].add(handler);
      this.sharedHandlers[ev] = handler;
    }

    this.startPolling();

    try {
      YouTubeAdapter.sharedPlayer.loadVideoById(videoId);
      emitTo(this.events['ready'] || new Set(), { id: videoId });
      return true;
    } catch (e) {
      console.warn('YouTubeAdapter loadVideoById failed', e);
      return false;
    }
  }

  private startPolling() {
    this.stopPolling();
    let lastEmit = 0;
    this.polling = window.setInterval(() => {
      if (!YouTubeAdapter.sharedPlayer) return;
      try {
        const now = Date.now();
        const t = YouTubeAdapter.sharedPlayer.getCurrentTime();
        const d = YouTubeAdapter.sharedPlayer.getDuration();
        // throttle timeupdate emissions to ~400ms
        if (now - lastEmit > 380) {
          emitTo(this.events['timeupdate'] || new Set(), t);
          lastEmit = now;
        }
        emitTo(this.events['durationchange'] || new Set(), d);
      } catch (e) {}
    }, 400);
  }
  private stopPolling() { if (this.polling) { clearInterval(this.polling); this.polling = null; } }

  async play() { if (!YouTubeAdapter.sharedPlayer) return; try { YouTubeAdapter.sharedPlayer.playVideo(); emitTo(this.events['statechange'] || new Set(), 'playing'); } catch(e) {} }
  playSync() { if (!YouTubeAdapter.sharedPlayer) return; try { YouTubeAdapter.sharedPlayer.playVideo(); } catch(e) {} }
  async pause() { if (!YouTubeAdapter.sharedPlayer) return; try { YouTubeAdapter.sharedPlayer.pauseVideo(); emitTo(this.events['statechange'] || new Set(), 'paused'); } catch(e) {} }
  async seek(seconds: number) { if (!YouTubeAdapter.sharedPlayer) return; try { YouTubeAdapter.sharedPlayer.seekTo(seconds, true); } catch(e) {} }
  async setVolume(v: number) { if (!YouTubeAdapter.sharedPlayer) return; try { YouTubeAdapter.sharedPlayer.setVolume(Math.round(v * 100)); emitTo(this.events['volumechange'] || new Set(), v); } catch(e) {} }
  async getCurrentTime() { if (!YouTubeAdapter.sharedPlayer) return 0; try { return YouTubeAdapter.sharedPlayer.getCurrentTime() || 0; } catch(e) { return 0; } }
  async getDuration() { if (!YouTubeAdapter.sharedPlayer) return 0; try { return YouTubeAdapter.sharedPlayer.getDuration() || 0; } catch(e) { return 0; } }
  async isPlaying() { if (!YouTubeAdapter.sharedPlayer) return false; try { const st = YouTubeAdapter.sharedPlayer.getPlayerState(); const YT = (window as any).YT; return st === YT.PlayerState.PLAYING; } catch(e) { return false; } }
  on(event: string, cb: Callback) { if (!this.events[event]) this.events[event] = new Set(); this.events[event].add(cb); }
  off(event: string, cb?: Callback) { if (!this.events[event]) return; if (!cb) this.events[event].clear(); else this.events[event].delete(cb); }
  destroy() {
    try {
      this.stopPolling();
      // remove forwarded shared event handlers
      if (this.sharedHandlers) {
        for (const ev of Object.keys(this.sharedHandlers)) {
          try { YouTubeAdapter.sharedEvents[ev].delete(this.sharedHandlers[ev]); } catch (e) {}
        }
        this.sharedHandlers = {};
      }
    } catch (e) {}
  }
}

class PlayerEngine {
  private adapter: IPlayer | null = null;
  private events: { [k: string]: Set<Callback> } = {} as any;
  private audioSingleton: AudioAdapter | null = null;

  async prewarm() {
    // Preload YouTube API and create shared player container
    try {
      await YouTubeAdapter.ensureShared();
      console.log('[PlayerEngine] YouTube API prewarmed');
    } catch (e) {
      console.warn('[PlayerEngine] prewarm failed', e);
    }
  }

  async load(track: any, streamUrl?: string) {
    // decide adapter
    const useYT = !!(track.videoId || (track.url && /youtube\.com|youtu\.be/.test(String(track.url))));
    // Reuse adapters where possible: keep a single AudioAdapter instance and a shared YouTube player
    if (this.adapter) {
      // If switching types, destroy previous adapter; otherwise reuse
      const isCurrentYT = this.adapter instanceof YouTubeAdapter;
      if (useYT && !isCurrentYT) {
        try { this.adapter.destroy(); } catch (e) {}
        this.adapter = new YouTubeAdapter();
      } else if (!useYT && isCurrentYT) {
        try { this.adapter.destroy(); } catch (e) {}
        // reuse or create singleton audio adapter
        if (!this.audioSingleton) this.audioSingleton = new AudioAdapter();
        this.adapter = this.audioSingleton;
      }
      // else same type — reuse existing adapter
    } else {
      if (useYT) this.adapter = new YouTubeAdapter();
      else {
        if (!this.audioSingleton) this.audioSingleton = new AudioAdapter();
        this.adapter = this.audioSingleton;
      }
    }

    // proxy adapter events
    const events = ['timeupdate','statechange','durationchange','volumechange','ready'];
    for (const ev of events) {
      try { this.adapter.off(ev); } catch (e) {}
      this.adapter.on(ev, (...args: any[]) => emitTo(this.events[ev] || new Set(), ...args));
    }

    await this.adapter.load(track, streamUrl);
  }

  // Gesture-safe synchronous load for immediate play: only supports non-YouTube (audio) paths.
  gestureLoad(track: any, streamUrl?: string) {
    const useYT = !!(track.videoId || (track.url && /youtube\.com|youtu\.be/.test(String(track.url))));
    if (useYT) return; // cannot synchronously prepare YT iframe
    // ensure audio adapter exists and is set as current adapter
    if (!this.audioSingleton) this.audioSingleton = new AudioAdapter();
    // destroy previous adapter if it was a YouTube adapter
    if (this.adapter && (this.adapter as any) instanceof YouTubeAdapter) {
      try { this.adapter.destroy(); } catch (e) {}
    }
    this.adapter = this.audioSingleton;
    try {
      // set src synchronously so a subsequent play() call from the same gesture will work
      (this.audioSingleton as any).setSrcSync(streamUrl || String(track.url || ''));
      // re-wire events for the adapter
      const events = ['timeupdate','statechange','durationchange','volumechange','ready'];
      for (const ev of events) {
        try { this.adapter.off(ev); } catch (e) {}
        this.adapter.on(ev, (...args: any[]) => emitTo(this.events[ev] || new Set(), ...args));
      }
    } catch (e) {}
  }

  // Gesture-friendly YouTube cue: attempts to cue the shared player synchronously if it's available.
  gestureCueYouTube(videoId: string) {
    try {
      if ((YouTubeAdapter as any).sharedPlayer) {
        try {
          if (!(this.adapter instanceof YouTubeAdapter)) {
            if (this.adapter) {
              try { this.adapter.destroy(); } catch (e) {}
            }
            this.adapter = new YouTubeAdapter();
          }

          const events = ['timeupdate','statechange','durationchange','volumechange','ready'];
          for (const ev of events) {
            try { this.adapter.off(ev); } catch (e) {}
            this.adapter.on(ev, (...args: any[]) => emitTo(this.events[ev] || new Set(), ...args));
          }

          return (this.adapter as YouTubeAdapter).gestureLoadById(videoId);
        } catch (e) { return false; }
      }
      return false;
    } catch (e) { return false; }
  }

  async play() { if (!this.adapter) return; await this.adapter.play(); }
  playSync() { if (!this.adapter) return; (this.adapter as any).playSync?.(); }
  async pause() { if (!this.adapter) return; await this.adapter.pause(); }
  async seek(seconds: number) { if (!this.adapter) return; await this.adapter.seek(seconds); }
  async setVolume(v: number) { if (!this.adapter) return; await this.adapter.setVolume(v); }
  async getCurrentTime() { if (!this.adapter) return 0; return await this.adapter.getCurrentTime(); }
  async getDuration() { if (!this.adapter) return 0; return await this.adapter.getDuration(); }
  async isPlaying() { if (!this.adapter) return false; return await this.adapter.isPlaying(); }

  on(event: string, cb: Callback) { if (!this.events[event]) this.events[event] = new Set(); this.events[event].add(cb); }
  off(event: string, cb?: Callback) { if (!this.events[event]) return; if (!cb) this.events[event].clear(); else this.events[event].delete(cb); }

  destroy() { if (this.adapter) { try { this.adapter.destroy(); } catch(e) {} this.adapter = null; } }
}

const engine = new PlayerEngine();
export default engine;
export type { IPlayer };
