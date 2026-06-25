import { memo, useEffect, useMemo, useRef, useState } from 'react';

function formatTime(t: number) {
  if (!isFinite(t) || isNaN(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const ProgressBarRaf = memo(function ProgressBarRaf({
  progress,
  duration,
  onSeek,
  className = '',
}: {
  progress: number;
  duration: number;
  onSeek: (seconds: number) => void;
  className?: string;
}) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastT = useRef<number>(performance.now());
  const target = useRef(progress);
  const [display, setDisplay] = useState(progress);

  useEffect(() => {
    target.current = progress;
    // kick animation if not running
    if (rafRef.current == null) {
      lastT.current = performance.now();
      const tick = () => {
        const now = performance.now();
        const dt = now - lastT.current;
        lastT.current = now;

        // critically-damped smoothing
        const k = 0.012; // lower = smoother, higher = closer to target
        setDisplay((cur) => {
          const next = cur + (target.current - cur) * (1 - Math.exp(-k * dt));
          return Math.abs(next - target.current) < 0.002 ? target.current : next;
        });

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      // keep RAF alive; teardown done on duration/unmount below
    };
  }, [progress]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  const percent = useMemo(() => {
    if (!duration) return 0;
    return Math.min(1, Math.max(0, display / duration));
  }, [display, duration]);

  const handleClick = (e: React.MouseEvent) => {
    if (!barRef.current || !duration) return;
    const rect = barRef.current.getBoundingClientRect();
    const p = (e.clientX - rect.left) / rect.width;
    const t = Math.min(duration, Math.max(0, p * duration));
    onSeek(t);
  };

  return (
    <div className={`w-full ${className}`.trim()}>
      <div
        ref={barRef}
        className="h-1 bg-white/[0.08] rounded-full w-full relative group cursor-pointer"
        onClick={handleClick}
      >
        <div
          className="h-full rounded-full absolute left-0 top-0 bg-gradient-to-r from-[#D8B86A] via-[#F2D98B] to-[#2ED3A2]"
          style={{ width: `${percent * 100}%` }}
        />
        <div
          className="w-3 h-3 rounded-full bg-[#F8E7AE] absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 shadow-[0_0_14px_rgba(216,184,106,0.6)]"
          style={{ left: `calc(${percent * 100}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-[11px] text-white/40 font-medium tracking-wide">
        <span>{formatTime(display)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
});

