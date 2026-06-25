import { useEffect, useState, useRef, useCallback, memo } from 'react';
import {
  ChevronDown, Play, Pause, SkipBack, SkipForward,
  Volume2, Heart, Loader2, Shuffle, Repeat, ListMusic, Plus,
  Disc3,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { getLyrics, normalizeTitle, normalizeArtist } from '../../lib/lyrics';
import { getTrackTitle } from '../../lib/musicDiscovery';
import { DynamicMusicBackdrop } from '../DynamicMusicBackdrop';
import { ProgressBarRaf } from './ProgressBarRaf';


// NOTE: timing debug / RAF meter are reserved for upcoming performance instrumentation.
// Kept non-invasive to avoid changing playback stability.


/* ─── Types ─────────────────────────────────────────────── */
interface LyricsLine { text: string; time: number }

/* ─── Parsing ────────────────────────────────────────────── */
function parseSyncedLyrics(synced?: string): LyricsLine[] {
  if (!synced) return [];
  const lines: LyricsLine[] = [];
  const regex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/;
  for (const raw of synced.split('\n')) {
    const m = raw.match(regex);
    if (m) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const ms = m[3] ? parseInt(m[3], 10) / (m[3].length === 2 ? 100 : 1000) : 0;
      lines.push({ text: m[4].trim(), time: min * 60 + sec + ms });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}



/* ─── Sub-components ─────────────────────────────────────── */

const AlbumArt = memo(function AlbumArt({ thumbnail, title }: { thumbnail: string; title: string }) {
  return (
    <div className="relative flex items-center justify-center">
      <div className="rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.5)] border border-white/[0.06]"
        style={{ width: 'min(65vw, 300px)', height: 'min(65vw, 300px)' }}>
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
});

// Progress bar: RAF-interpolated to avoid stutter/jank.


function PlaylistDropdown({ playlists, currentTrackId, onAdd, onRemove, onClose }: {
  playlists: Array<{ id: string; name: string; tracks: Array<{ id: string }> }>;
  currentTrackId: string; onAdd: (pid: string, track: any) => void;
  onRemove: (pid: string, tid: string) => void; onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 bottom-14 w-48 rounded-xl bg-[#0C0D0F]/95 backdrop-blur-xl border border-white/[0.06] p-1.5 shadow-2xl z-50">
        <p className="text-[10px] font-bold text-white/40 px-2.5 py-1.5 uppercase tracking-wider">Add to playlist</p>
        {playlists.length === 0 ? <p className="text-xs text-white/30 px-2.5 py-1.5 italic">No playlists</p> : (
          playlists.map(pl => {
            const exists = pl.tracks.some(t => t.id === currentTrackId);
            return (
              <button key={pl.id} onClick={() => { if (exists) onRemove(pl.id, currentTrackId); else onAdd(pl.id, { id: currentTrackId } as any); onClose(); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between ${exists ? 'text-[#F2D98B] bg-[#D8B86A]/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                <span className="truncate">{pl.name}</span>
                {exists && <span className="text-[9px] uppercase text-[#F2D98B]">Added</span>}
              </button>
            );
          })
        )}
      </div>
    </>
  );
}

const Controls = memo(function Controls({
  isPlaying, isLoading, shuffle, repeat, queue, onTogglePlay, onPrev, onNext, onShuffle, onRepeat, onClearQueue,
}: {
  isPlaying: boolean; isLoading: boolean; shuffle: boolean; repeat: 'off' | 'all' | 'one'; queue: unknown[];
  onTogglePlay: () => void; onPrev: () => void; onNext: () => void; onShuffle: () => void; onRepeat: () => void; onClearQueue: () => void;
}) {
  const Btn = ({ onClick, active, disabled, children }: { onClick: () => void; active?: boolean; disabled?: boolean; children: React.ReactNode }) => (
    <button onClick={onClick} disabled={disabled}
      className={`transition-colors ${disabled ? 'text-white/15 cursor-not-allowed' : active ? 'text-[#D8B86A]' : 'text-white/40 hover:text-white/80'}`}>
      {children}
    </button>
  );
  return (
    <div className="flex items-center justify-center gap-5 md:gap-7">
      <Btn onClick={onShuffle} active={shuffle}><Shuffle size={18} /></Btn>
      <Btn onClick={onClearQueue} disabled={queue.length === 0}><ListMusic size={18} /></Btn>
      <Btn onClick={onPrev}><SkipBack size={22} className="fill-current" /></Btn>
      <button onClick={onTogglePlay}
        className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] transition-shadow shrink-0">
        {isLoading && !isPlaying ? <Loader2 size={26} className="animate-spin" /> :
         isPlaying ? <Pause size={26} className="fill-current" /> :
                     <Play size={26} className="fill-current ml-1" />}
      </button>
      <Btn onClick={onNext}><SkipForward size={22} className="fill-current" /></Btn>
      <Btn onClick={onRepeat} active={repeat !== 'off'}>
        <span className="relative"><Repeat size={18} />{repeat === 'one' && <span className="absolute -top-2 -right-2 text-[7px] font-bold">1</span>}</span>
      </Btn>
    </div>
  );
});

/* ─── Lyrics Panel (inline, no card) ────────────────────── */
function LyricsPanel({
  syncedLines, plainLyrics, lyricsLoading, lyricsNotFound,
  currentLineIndex, containerRef, onSeek,
}: {
  syncedLines: LyricsLine[]; plainLyrics: string; lyricsLoading: boolean;
  lyricsNotFound: boolean; currentLineIndex: number;
  containerRef: React.RefObject<HTMLDivElement | null>; onSeek: (t: number) => void;
}) {
  return (
    <div ref={containerRef}
      className="flex-1 overflow-y-auto scrollbar-hide select-none flex flex-col items-center gap-5 scroll-smooth px-4 pb-32 pt-16"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
      }}>
      {lyricsLoading ? (
        <div className="flex flex-col items-center gap-3 text-white/40 py-20">
          <Loader2 size={24} className="animate-spin" />
          <span className="text-xs font-semibold tracking-widest uppercase">Loading lyrics</span>
        </div>
      ) : lyricsNotFound ? (
        <div className="flex flex-col items-center text-white/25 py-20 text-center gap-1">
          <p className="text-sm font-bold">No lyrics available</p>
          <p className="text-xs opacity-60">Enjoy the music</p>
        </div>
      ) : syncedLines.length > 0 ? (
        // Virtualize to keep DOM node count low (but keep visual centered feel)
        (() => {
          const active = currentLineIndex;
          const start = Math.max(0, active - 7);
          const end = Math.min(syncedLines.length, active + 8);
          const visible = syncedLines.slice(start, end);
          return (
            <div className="w-full">
              {/* top spacer */}
              <div style={{ height: Math.max(0, start - 0) * 44 }} aria-hidden />
              {visible.map((line, i) => {
                const idx = start + i;
                const isActive = idx === currentLineIndex;
                return (
                  <div
                    key={idx}
                    id={`lyrics-line-${idx}`}
                    role="button"
                    tabIndex={-1}
                    onClick={() => onSeek(line.time)}
                    className="w-full text-left cursor-pointer select-none"
                    style={{
                      height: 44,
                      display: 'flex',
                      alignItems: 'center',
                      opacity: isActive ? 1 : 0.18,
                      transform: isActive ? 'translateZ(0)' : 'translateZ(0)',
                      willChange: isActive ? 'opacity' : undefined,
                    }}
                  >
                    <p
                      className={
                        isActive
                          ? 'text-white text-xl md:text-2xl lg:text-3xl font-bold drop-shadow-[0_0_20px_rgba(216,184,106,0.08)]'
                          : 'text-white/30 text-base md:text-lg font-medium'
                      }
                    >
                      {line.text}
                    </p>
                  </div>
                );
              })}
              {/* bottom spacer */}
              <div style={{ height: Math.max(0, syncedLines.length - end) * 44 }} aria-hidden />
            </div>
          );
        })()
      ) : (
        <pre className="whitespace-pre-wrap font-sans text-base md:text-lg text-white/40 leading-relaxed text-center max-w-lg">{plainLyrics}</pre>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export function FullscreenPlayer() {
  const {
    currentTrack, isPlaying, isLoading, volume, progress, shuffle, repeat, queue,
    setPlaying, setVolume, nextTrack, prevTrack,
    isFullscreen, setFullscreen, setShuffle, setRepeat, seek, clearQueue,
  } = usePlayerStore();

  const { favorites, addFavorite, removeFavorite, playlists, addTrackToPlaylist, removeTrackFromPlaylist } = useLibraryStore();

  const [showPlaylist, setShowPlaylist] = useState(false);
  const [syncedLines, setSyncedLines] = useState<LyricsLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState('');
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsNotFound, setLyricsNotFound] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const activeIdxRef = useRef(-1);
  const rafScrollRef = useRef<number | null>(null);
  const [lyricsExpanded, setLyricsExpanded] = useState(false);


  const isLiked = !!currentTrack && favorites.some(t => t.id === currentTrack.id);
  const title = currentTrack ? getTrackTitle(currentTrack) : '';

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [setFullscreen]);

  useEffect(() => {
    setSyncedLines([]); setPlainLyrics(''); setLyricsNotFound(false); setCurrentLineIndex(-1);
    if (!currentTrack) return;
    const ac = new AbortController();
    const nt = normalizeTitle(getTrackTitle(currentTrack));
    const na = normalizeArtist(currentTrack.artist);
    setLyricsLoading(true);
    getLyrics(nt, na, ac.signal)
      .then(d => {
        if (!d) { setLyricsNotFound(true); return; }
        if (d.syncedLyrics) {
          const p = parseSyncedLyrics(d.syncedLyrics);
          if (p.length) { setSyncedLines(p); return; }
          const pl = d.syncedLyrics.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
          if (pl) { setPlainLyrics(pl); return; }
        }
        if (d.plainLyrics) setPlainLyrics(d.plainLyrics);
        else setLyricsNotFound(true);
      })
      .catch(err => { if ((err as any)?.name !== 'AbortError') setLyricsNotFound(true); })
      .finally(() => setLyricsLoading(false));
    return () => ac.abort();
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist]);

  useEffect(() => {
    if (!syncedLines.length) return;
    const idx = syncedLines.findIndex((l, i) => {
      const next = syncedLines[i + 1];
      return progress >= l.time && (!next || progress < next.time);
    });

    if (idx === -1) return;
    if (idx !== activeIdxRef.current) {
      activeIdxRef.current = idx;
      setCurrentLineIndex(idx);

      // Scroll only when active line changes; throttle by rAF.
      if (lyricsRef.current) {
        const el = document.getElementById(`lyrics-line-${idx}`);
        if (el) {
          if (rafScrollRef.current != null) cancelAnimationFrame(rafScrollRef.current);
          rafScrollRef.current = requestAnimationFrame(() => {
            if (!lyricsRef.current) return;
            const container = lyricsRef.current;
            const top = (el as HTMLElement).offsetTop - container.clientHeight / 2 + (el as HTMLElement).clientHeight / 2;
            container.scrollTo({ top, behavior: 'auto' });
          });
        }
      }
    }
  }, [progress, syncedLines]);

  useEffect(() => {
    return () => {
      if (rafScrollRef.current != null) cancelAnimationFrame(rafScrollRef.current);
    };
  }, []);


  const togglePlay = useCallback(() => { if (currentTrack) setPlaying(!isPlaying); }, [currentTrack, isPlaying, setPlaying]);
  const toggleLike = useCallback(() => { if (!currentTrack) return; isLiked ? removeFavorite(currentTrack.id) : addFavorite(currentTrack); }, [currentTrack, isLiked, addFavorite, removeFavorite]);
  const toggleShuffle = useCallback(() => setShuffle(!shuffle), [shuffle, setShuffle]);
  const cycleRepeat = useCallback(() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off'), [repeat, setRepeat]);
  const handlePrev = useCallback(() => { const r: unknown = prevTrack(); if (r instanceof Promise) r.catch(() => {}); }, [prevTrack]);
  const handleNext = useCallback(() => { const r: unknown = nextTrack(); if (r instanceof Promise) r.catch(() => {}); }, [nextTrack]);
  const handleSeek = useCallback((t: number) => seek(t), [seek]);

  if (!isFullscreen || !currentTrack) return null;

  return (
    <div className="fixed inset-0 z-50 text-white flex flex-col overflow-hidden bg-[#050607]">
      <DynamicMusicBackdrop track={currentTrack} intensity="full" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)] z-[1]" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4 md:px-10 md:py-5">
        <button onClick={() => setFullscreen(false)}
          className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center border border-white/[0.06] backdrop-blur-sm transition-colors" aria-label="Minimize">
          <ChevronDown size={20} className="text-white/70" />
        </button>
        <div className="flex items-center gap-2">
          <Disc3 size={14} className="text-[#D8B86A]/60" />
          <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-white/30">Sumic</span>
        </div>
        <div className="w-9 h-9" />
      </header>

      {/* ── Mobile ── */}
      <div className="relative z-10 flex-1 flex flex-col md:hidden px-5 pb-6 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0">
          <AlbumArt thumbnail={currentTrack.thumbnail} title={title} />
          <div className="w-full text-center mt-2">
            <h2 className="text-lg font-bold truncate drop-shadow-sm">{title}</h2>
            <p className="text-sm text-white/50 font-medium truncate mt-0.5">{currentTrack.artist}</p>
          </div>
        </div>
        <ProgressBarRaf progress={progress} duration={currentTrack.duration} onSeek={handleSeek} />

        <div className="mt-4 mb-2">
          <Controls isPlaying={isPlaying} isLoading={isLoading} shuffle={shuffle} repeat={repeat} queue={queue}
            onTogglePlay={togglePlay} onPrev={handlePrev} onNext={handleNext}
            onShuffle={toggleShuffle} onRepeat={cycleRepeat} onClearQueue={clearQueue} />
        </div>
        <button onClick={() => setLyricsExpanded(!lyricsExpanded)}
          className="text-[10px] text-white/20 text-center tracking-widest uppercase mt-1">
          {lyricsExpanded ? 'Hide lyrics' : 'Show lyrics'}
        </button>
      </div>

      {/* ── Desktop ── */}
      <div className="relative z-10 hidden md:flex flex-1 px-10 lg:px-16 pb-6 gap-6 lg:gap-12 min-h-0">
        {/* Left — Album + Controls */}
        <div className="flex-[5] flex flex-col items-center justify-center gap-5 min-h-0">
          <AlbumArt thumbnail={currentTrack.thumbnail} title={title} />
          <div className="text-center w-full max-w-sm">
            <h1 className="text-2xl lg:text-3xl font-bold truncate drop-shadow-sm">{title}</h1>
            <p className="text-base text-white/50 font-medium truncate mt-1">{currentTrack.artist}</p>
          </div>
          <div className="w-full max-w-sm">
            <ProgressBarRaf progress={progress} duration={currentTrack.duration} onSeek={handleSeek} />
          </div>
          <Controls isPlaying={isPlaying} isLoading={isLoading} shuffle={shuffle} repeat={repeat} queue={queue}
            onTogglePlay={togglePlay} onPrev={handlePrev} onNext={handleNext}
            onShuffle={toggleShuffle} onRepeat={cycleRepeat} onClearQueue={clearQueue} />
          <div className="flex items-center justify-center gap-6 w-full max-w-sm">
            <button onClick={toggleLike}>
              <Heart size={18} className={isLiked ? 'fill-[#D8B86A] text-[#D8B86A]' : 'text-white/40 hover:text-white/70 transition-colors'} />
            </button>
            <div className="flex items-center gap-2 flex-1 max-w-[160px]">
              <Volume2 size={14} className="text-white/30 shrink-0" />
              <input type="range" min={0} max={1} step={0.01} value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="flex-1 accent-[#D8B86A] cursor-pointer h-1 rounded-full bg-white/[0.08]" />
            </div>
            <div className="relative shrink-0">
              <button onClick={() => setShowPlaylist(!showPlaylist)} className="text-white/40 hover:text-white/70 transition-colors">
                <Plus size={18} />
              </button>
              {showPlaylist && <PlaylistDropdown playlists={playlists} currentTrackId={currentTrack.id}
                onAdd={addTrackToPlaylist} onRemove={removeTrackFromPlaylist} onClose={() => setShowPlaylist(false)} />}
            </div>
          </div>
        </div>

        {/* Right — Lyrics inline (no card) */}
        <div className="flex-[5] flex flex-col min-h-0 overflow-hidden">
          <div className="shrink-0 pt-5 pb-2 flex items-center gap-2 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D8B86A]/60" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">Lyrics</span>
          </div>
          <LyricsPanel syncedLines={syncedLines} plainLyrics={plainLyrics}
            lyricsLoading={lyricsLoading} lyricsNotFound={lyricsNotFound}
            currentLineIndex={currentLineIndex} containerRef={lyricsRef} onSeek={handleSeek} />
        </div>
      </div>

      {/* ── Mobile lyrics overlay ── */}
      {lyricsExpanded && (
        <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-xl flex flex-col md:hidden">
          <div className="flex items-center justify-between px-5 py-4 shrink-0">
            <button onClick={() => setLyricsExpanded(false)} className="text-white/50 text-xs font-bold tracking-widest uppercase">Close</button>
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/30">Lyrics</span>
            <div className="w-12" />
          </div>
          <LyricsPanel syncedLines={syncedLines} plainLyrics={plainLyrics}
            lyricsLoading={lyricsLoading} lyricsNotFound={lyricsNotFound}
            currentLineIndex={currentLineIndex} containerRef={lyricsRef} onSeek={handleSeek} />
        </div>
      )}
    </div>
  );
}