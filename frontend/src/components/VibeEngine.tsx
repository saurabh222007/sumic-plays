import { useEffect, useRef } from 'react';
import { useVibeStore, type VibeType } from '../store/useVibeStore';
import { usePlayerStore } from '../store/usePlayerStore';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

function createParticles(vibe: VibeType, color: string, width: number, height: number, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const p: Particle = {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      size: 0,
      life: Math.random(),
      maxLife: 1,
      color,
    };

    switch (vibe) {
      case 'aggressive':
        p.vx = (Math.random() - 0.5) * 4;
        p.vy = -Math.random() * 3 - 1;
        p.size = Math.random() * 4 + 2;
        p.maxLife = Math.random() * 0.8 + 0.4;
        break;
      case 'emotional':
        p.vx = (Math.random() - 0.5) * 0.5;
        p.vy = (Math.random() - 0.5) * 0.3;
        p.size = Math.random() * 6 + 3;
        p.maxLife = Math.random() * 2 + 1;
        break;
      case 'energetic':
        p.vx = (Math.random() - 0.5) * 3;
        p.vy = (Math.random() - 0.5) * 3;
        p.size = Math.random() * 3 + 1;
        p.maxLife = Math.random() * 0.6 + 0.3;
        break;
      default:
        p.vx = (Math.random() - 0.5) * 0.3;
        p.vy = -Math.random() * 0.5;
        p.size = Math.random() * 3 + 1;
        p.maxLife = Math.random() * 3 + 2;
    }

    particles.push(p);
  }
  return particles;
}

export function VibeEngine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const { currentVibe, vibeColor } = useVibeStore();
  const { isPlaying, currentTrack } = usePlayerStore();
  const { detectVibeFromKeywords } = useVibeStore();

  // Detect vibe when track changes
  useEffect(() => {
    if (currentTrack) {
      detectVibeFromKeywords(currentTrack.title, currentTrack.artist);
    }
  }, [currentTrack, detectVibeFromKeywords]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const particleCount = currentVibe === 'aggressive' ? 60 : currentVibe === 'energetic' ? 45 : 25;
    particlesRef.current = createParticles(currentVibe, vibeColor, canvas.offsetWidth, canvas.offsetHeight, particleCount);

    const animate = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      if (!isPlaying) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.008;

        if (p.life <= 0 || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
          // Respawn
          p.x = Math.random() * w;
          p.y = currentVibe === 'aggressive' ? h + 10 : Math.random() * h;
          p.life = p.maxLife;
        }

        const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
        ctx.globalAlpha = alpha * 0.6;

        if (currentVibe === 'emotional') {
          // Soft glowing orbs
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
          gradient.addColorStop(0, vibeColor);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (currentVibe === 'aggressive') {
          // Sharp fast particles with trails
          ctx.fillStyle = vibeColor;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          // Trail
          ctx.globalAlpha = alpha * 0.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 4, p.y - p.vy * 4);
          ctx.strokeStyle = vibeColor;
          ctx.lineWidth = p.size * 0.5;
          ctx.stroke();
        } else if (currentVibe === 'energetic') {
          // Motion streaks
          ctx.strokeStyle = vibeColor;
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 6, p.y - p.vy * 6);
          ctx.stroke();
        } else {
          // Neutral - subtle floating dots
          ctx.fillStyle = vibeColor;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [currentVibe, vibeColor, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: isPlaying ? 0.4 : 0.1 }}
    />
  );
}
