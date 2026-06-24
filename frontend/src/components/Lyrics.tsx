import { useEffect, useRef, useState } from 'react';
import { Mic2, Loader2, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../store/usePlayerStore';
import { getLyrics } from '../lib/lyrics';

interface LyricsLine {
  text: string;
  time: number;
}

function parseSyncedLyrics(synced?: string): LyricsLine[] {
  if (!synced) return [];
  const lines: LyricsLine[] = [];
  const regex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/;
  for (const raw of synced.split('\n')) {
    const m = raw.match(regex);
    if (m) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const ms  = m[3] ? parseInt(m[3].padEnd(3, '0'), 10) / 1000 : 0;
      const text = m[4].trim();
      if (text) lines.push({ text, time: min * 60 + sec + ms });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

function cleanPlain(synced?: string) {
  if (!synced) return '';
  return synced.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
}

export function Lyrics() {
  const { currentTrack, progress, seek } = usePlayerStore();
  const [syncedLines, setSyncedLines] = useState<LyricsLine[]>([]);
  const [plainText, setPlainText]     = useState('');
  const [loading, setLoading]         = useState(false);
  const [notFound, setNotFound]       = useState(false);
  const [activeIdx, setActiveIdx]     = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Fetch lyrics whenever track changes ─────────────────────────────────
  useEffect(() => {
    setSyncedLines([]);
    setPlainText('');
    setNotFound(false);
    setActiveIdx(-1);
    if (!currentTrack) return;
    const controller = new AbortController();
    setLoading(true);
    getLyrics(currentTrack.title, currentTrack.artist, controller.signal)
      .then((data) => {
        if (!data) { setNotFound(true); return; }
        if (data?.syncedLyrics) {
          const parsed = parseSyncedLyrics(data.syncedLyrics);
          if (parsed.length > 0) { setSyncedLines(parsed); return; }
          const plain = cleanPlain(data.syncedLyrics);
          if (plain) { setPlainText(plain); return; }
        }
        if (data?.plainLyrics) {
          setPlainText(data.plainLyrics);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => { if ((err as any)?.name !== 'AbortError') setNotFound(true); })
      .finally(() => { setLoading(false); });

    return () => { controller.abort(); };
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist]);

  // ── Karaoke sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (syncedLines.length === 0) return;
    const idx = syncedLines.findIndex((line, i) => {
      const next = syncedLines[i + 1];
      return progress >= line.time && (!next || progress < next.time);
    });
    if (idx !== -1 && idx !== activeIdx) {
      setActiveIdx(idx);
      const el = document.getElementById(`lp-line-${idx}`);
      if (el && containerRef.current) {
        containerRef.current.scrollTo({
          top: el.offsetTop - containerRef.current.clientHeight / 2 + el.clientHeight / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [progress, syncedLines, activeIdx]);

  if (!currentTrack) return null;

  return (
    <div className="rounded-2xl overflow-hidden bg-surface/60 border border-white/10 flex flex-col" style={{ maxHeight: '320px' }}>
      {/* Header */}
      <div className="flex items-center gap-2 text-white font-semibold px-5 pt-4 pb-2 shrink-0">
        <Mic2 size={17} className="text-primary" />
        <span className="text-sm font-bold tracking-wide">Lyrics</span>
      </div>

      {/* Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-5 relative"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
        }}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-text-secondary text-sm py-6"
            >
              <Loader2 size={15} className="animate-spin text-primary" />
              <span>Searching for lyrics…</span>
            </motion.div>
          ) : notFound ? (
            <motion.div
              key="notfound"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-2 py-8 text-center"
            >
              <Music size={22} className="text-white/20" />
              <p className="text-text-secondary text-sm">Lyrics currently unavailable</p>
            </motion.div>
          ) : syncedLines.length > 0 ? (
            <motion.div
              key="synced"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-6"
            >
              <div className="h-32 shrink-0 w-full" />
              {syncedLines.map((line, idx) => {
                const isActive = idx === activeIdx;
                return (
                  <motion.p
                    key={idx}
                    id={`lp-line-${idx}`}
                    animate={{
                      opacity: isActive ? 1 : 0.28,
                      scale: isActive ? 1.04 : 1,
                      filter: isActive ? 'blur(0px)' : 'blur(0.4px)',
                    }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className={`text-sm font-semibold leading-relaxed cursor-pointer text-center origin-center select-none transition-colors ${
                      isActive ? 'text-white animate-lyric-glow' : 'text-white/40'
                    }`}
                    onClick={() => { seek(line.time); }}
                  >
                    {line.text}
                  </motion.p>
                );
              })}
              <div className="h-64 shrink-0 w-full" />
            </motion.div>
          ) : (
            <motion.pre
              key="plain"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="whitespace-pre-wrap font-sans text-sm text-white/70 leading-relaxed py-4"
            >
              {plainText}
            </motion.pre>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
