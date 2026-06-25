import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Track } from '../store/usePlayerStore';

interface DynamicMusicBackdropProps {
  track: Track | null;
  intensity?: 'subtle' | 'full';
}

interface Palette {
  primary: string;
  secondary: string;
  accent: string;
  base: string;
  r: number;
  g: number;
  b: number;
}

function fallbackColors(): Palette {
  return {
    primary: 'rgba(216,184,106,0.18)',
    secondary: 'rgba(46,211,162,0.12)',
    accent: 'rgba(139,92,246,0.08)',
    base: '#050607',
    r: 216,
    g: 184,
    b: 106,
  };
}

function rgba(r: number, g: number, b: number, a: number) {
  return `rgba(${r},${g},${b},${a})`;
}

interface RawPalette {
  r: number;
  g: number;
  b: number;
  accentR: number;
  accentG: number;
  accentB: number;
}

function extractRaw(img: HTMLImageElement): RawPalette {
  const canvas = document.createElement('canvas');
  const size = 24;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { r: 216, g: 184, b: 106, accentR: 46, accentG: 211, accentB: 162 };
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  let r = 0, g = 0, b = 0, count = 0;
  let accentR = 0, accentG = 0, accentB = 0, maxSat = -1;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 80) continue;
    const cr = data[i], cg = data[i + 1], cb = data[i + 2];
    r += cr; g += cg; b += cb;
    count += 1;
    const min = Math.min(cr, cg, cb);
    const max = Math.max(cr, cg, cb);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (sat > maxSat) { maxSat = sat; accentR = cr; accentG = cg; accentB = cb; }
  }

  if (!count) return { r: 216, g: 184, b: 106, accentR: 46, accentG: 211, accentB: 162 };
  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);
  return { r, g, b, accentR, accentG, accentB };
}

function buildPalette(raw: RawPalette, intensity: 'subtle' | 'full'): Palette {
  const warmR = Math.min(255, Math.round(raw.r * 1.06 + 14));
  const warmG = Math.min(255, Math.round(raw.g * 1.02 + 10));
  const warmB = Math.max(20, Math.round(raw.b * 0.94));
  const a = intensity === 'full' ? 0.34 : 0.16;
  const a2 = intensity === 'full' ? 0.22 : 0.10;
  const a3 = intensity === 'full' ? 0.14 : 0.06;
  return {
    primary: rgba(warmR, warmG, warmB, a),
    secondary: rgba(raw.accentR, raw.accentG, raw.accentB, a2),
    accent: rgba(warmB, warmR, warmG, a3),
    base: '#050607',
    r: warmR, g: warmG, b: warmB,
  };
}

export function DynamicMusicBackdrop({ track, intensity = 'subtle' }: DynamicMusicBackdropProps) {
  const [colors, setColors] = useState<Palette>(fallbackColors);
  const thumbKey = track?.thumbnail || 'fallback';

  useEffect(() => {
    if (!track?.thumbnail) { setColors(fallbackColors()); return; }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = track.thumbnail;
    img.onload = () => {
      if (cancelled) return;
      setColors(buildPalette(extractRaw(img), intensity));
    };
    img.onerror = () => { if (!cancelled) setColors(fallbackColors()); };
    return () => { cancelled = true; };
  }, [track?.thumbnail, intensity]);

  const blurOpacity = track?.thumbnail ? (intensity === 'full' ? 0.25 : 0.10) : 0;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden isolate">
      {/* Morphing gradient background — no key so it animates smoothly between tracks */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: `
            radial-gradient(ellipse 90% 60% at 20% 20%, ${colors.primary}, transparent 60%),
            radial-gradient(ellipse 70% 80% at 80% 30%, ${colors.secondary}, transparent 55%),
            radial-gradient(ellipse 60% 60% at 50% 90%, ${colors.accent}, transparent 50%),
            linear-gradient(180deg, rgba(13,16,17,0.92) 0%, ${colors.base} 60%, #030404 100%)
          `,
        }}
        transition={{ duration: 1.8, ease: [0.25, 0.1, 0.25, 1] }}
      />

      {/* Blurred artwork — crossfades */}
      <AnimatePresence>
        <motion.div
          key={thumbKey}
          initial={{ opacity: 0, scale: 1.2 }}
          animate={{ opacity: blurOpacity, scale: 1.08 }}
          exit={{ opacity: 0, scale: 1.15 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute inset-[-12%] bg-center bg-cover blur-[100px]"
          style={{ backgroundImage: track?.thumbnail ? `url(${track.thumbnail})` : undefined }}
        />
      </AnimatePresence>

      {/* Drifting orbs that slowly float — add life */}
      <motion.div
        aria-hidden
        className="absolute -top-[20%] -left-[10%] h-[50vh] w-[50vh] rounded-full blur-[100px] opacity-40"
        style={{ background: `radial-gradient(circle, ${colors.primary.replace(/[\d.]+\)$/, '0.25)')}, transparent 70%)` }}
        animate={{ x: [0, 30, -15, 0], y: [0, 20, -10, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-[15%] -right-[10%] h-[45vh] w-[45vh] rounded-full blur-[100px] opacity-30"
        style={{ background: `radial-gradient(circle, ${colors.secondary.replace(/[\d.]+\)$/, '0.2)')}, transparent 70%)` }}
        animate={{ x: [0, -25, 15, 0], y: [0, -15, 10, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Subtle noise texture */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
      />
    </div>
  );
}