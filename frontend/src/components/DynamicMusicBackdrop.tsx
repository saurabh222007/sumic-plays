import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Track } from '../store/usePlayerStore';

interface DynamicMusicBackdropProps {
  track: Track | null;
  intensity?: 'subtle' | 'full';
}

function fallbackColors() {
  return {
    primary: 'rgba(216,184,106,0.20)',
    secondary: 'rgba(46,211,162,0.14)',
    base: '#050607',
  };
}

function rgba(r: number, g: number, b: number, a: number) {
  return `rgba(${r},${g},${b},${a})`;
}

export function DynamicMusicBackdrop({ track, intensity = 'subtle' }: DynamicMusicBackdropProps) {
  const [colors, setColors] = useState(fallbackColors);

  useEffect(() => {
    if (!track?.thumbnail) {
      setColors(fallbackColors());
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = track.thumbnail;

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        const size = 12;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 80) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count += 1;
        }

        if (!count) return;
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        const warmR = Math.min(255, Math.round(r * 1.08 + 18));
        const warmG = Math.min(255, Math.round(g * 1.03 + 12));
        const warmB = Math.max(20, Math.round(b * 0.92));

        setColors({
          primary: rgba(warmR, warmG, warmB, intensity === 'full' ? 0.34 : 0.18),
          secondary: rgba(Math.max(30, b), Math.max(90, g), Math.max(90, r), intensity === 'full' ? 0.22 : 0.10),
          base: '#050607',
        });
      } catch {
        setColors(fallbackColors());
      }
    };

    img.onerror = () => {
      if (!cancelled) setColors(fallbackColors());
    };

    return () => {
      cancelled = true;
    };
  }, [track?.thumbnail, intensity]);

  const blurOpacity = track?.thumbnail ? (intensity === 'full' ? 0.24 : 0.10) : 0;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        key={track?.thumbnail || 'fallback-art'}
        initial={{ opacity: 0 }}
        animate={{ opacity: blurOpacity }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.75, ease: 'easeOut' }}
        className="absolute inset-[-8%] bg-center bg-cover blur-3xl scale-110"
        style={{ backgroundImage: track?.thumbnail ? `url(${track.thumbnail})` : undefined }}
      />
      <motion.div
        animate={{
          background: `
            radial-gradient(circle at 18% 18%, ${colors.primary}, transparent 34%),
            radial-gradient(circle at 82% 24%, ${colors.secondary}, transparent 32%),
            linear-gradient(180deg, rgba(13,16,17,0.96) 0%, ${colors.base} 66%, #030404 100%)
          `,
        }}
        transition={{ duration: 0.85, ease: 'easeInOut' }}
        className="absolute inset-0"
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.014)_1px,transparent_1px)] bg-[size:54px_54px] opacity-35" />
    </div>
  );
}
