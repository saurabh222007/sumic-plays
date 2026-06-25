import { Suspense, lazy, useState, useRef } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

const ASCIIText = lazy(() => import('../components/ASCIIText'));

// ─── Animated heart SVG ───────────────────────────────────────────────────────
function addRipple(e: React.MouseEvent<HTMLButtonElement>) {
  const btn = e.currentTarget;
  const circle = document.createElement('span');
  const rect   = btn.getBoundingClientRect();
  circle.className = 'ripple';
  circle.style.left = `${e.clientX - rect.left}px`;
  circle.style.top  = `${e.clientY - rect.top}px`;
  btn.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
}

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as any },
  },
};

// Per-element delay helpers
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: 'easeOut' as const },
});

// Pre-generate particles once so they don't re-randomize on render
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x:  Math.random() * 100,   // % of viewport width
  size: Math.random() * 5 + 3,
  dur: Math.random() * 14 + 9,
  delay: Math.random() * 8,
  opacity: Math.random() * 0.35 + 0.1,
}));

export function Auth() {
  const [apiKey, setApiKey]   = useState('');
  const [shaking, setShaking] = useState(false);
  const { loginWithKey, loginAsGuest } = useAuthStore();
  const navigate = useNavigate();
  const inputRef  = useRef<HTMLInputElement>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setShaking(true);
      setTimeout(() => setShaking(false), 520);
      inputRef.current?.focus();
      return;
    }
    loginWithKey(apiKey.trim());
    navigate('/');
  };

  const handleGuest = (e: React.MouseEvent<HTMLButtonElement>) => {
    addRipple(e);
    loginAsGuest();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-4 select-none">
      {/* Ambient glow orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/8 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/6 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/4 blur-[180px] pointer-events-none" />

      {/* Floating particles */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-primary"
            style={{
              left: `${p.x}%`,
              bottom: '-10px',
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: 0,
            }}
            animate={{
              y: [0, -(typeof window !== 'undefined' ? window.innerHeight + 40 : 900)],
              opacity: [0, p.opacity, p.opacity * 0.6, 0],
            }}
            transition={{
              duration: p.dur,
              delay: p.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Card */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="z-10 bg-surface/55 backdrop-blur-2xl p-8 md:p-11 rounded-3xl border border-glass-border shadow-elevated w-full max-w-md relative overflow-hidden"
      >
        {/* Interior glow */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-primary/12 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-accent/8 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          {/* Brand */}
          <motion.div
            {...fadeUp(0.3)}
            className="flex flex-col items-center mb-9"
          >
                <div className="relative mb-5 h-20 w-20 rounded-2xl overflow-hidden border border-[#D8B86A]/20 bg-[#080A0C] shadow-[0_0_32px_rgba(216,184,106,0.16)]">
                <Suspense fallback={<div className="h-full w-full bg-[#0B0E10]" />}>
                <ASCIIText text="Sumic!" enableWaves asciiFontSize={8} textFontSize={160} planeBaseHeight={7} />
              </Suspense>
            </div>

            <h1 className="text-4xl font-black tracking-widest text-text-primary uppercase">
              SUMIC
            </h1>
            <p className="text-[11px] font-semibold text-text-muted tracking-[0.18em] uppercase mt-1.5 text-center leading-relaxed">
              Crafted by Someone, Synced for Everyone
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            {...fadeUp(0.46)}
            onSubmit={handleLogin}
            className="space-y-4"
          >
            <div>
              <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-[0.14em] mb-2">
                Gemini API Key
              </label>
              <motion.div animate={shaking ? { x: [-6, 6, -4, 4, -2, 2, 0] } : { x: 0 }} transition={{ duration: 0.45 }}>
                <input
                  ref={inputRef}
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter key to unlock AI Vibe Search…"
                  className="w-full bg-surface-light hover:bg-surface-hover border border-glass-border rounded-2xl p-4 text-text-primary field-focus focus:border-primary/40 transition-all text-sm placeholder:text-text-muted"
                />
              </motion.div>
            </div>

            <button
              type="submit"
              className="ripple-container w-full bg-primary hover:bg-primary-light text-black font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 btn-interactive shadow-md text-sm cursor-pointer"
              onClick={(e) => addRipple(e as any)}
            >
              <Sparkles size={17} />
              Unlock AI Vibe Search
            </button>
          </motion.form>

          {/* Divider */}
          <motion.div
            {...fadeUp(0.54)}
            className="my-5 flex items-center gap-4"
          >
            <div className="h-px bg-glass-border flex-1" />
            <span className="text-text-muted text-[10px] font-bold uppercase tracking-wider">or</span>
            <div className="h-px bg-glass-border flex-1" />
          </motion.div>

          {/* Guest */}
          <motion.div {...fadeUp(0.62)}>
            <button
              onClick={handleGuest}
              className="ripple-container w-full bg-surface-light hover:bg-surface-hover border border-glass-border text-text-primary font-bold py-4 rounded-2xl flex items-center justify-center gap-2 btn-interactive cursor-pointer text-sm"
            >
              <span>Continue in Guest Mode</span>
              <ArrowRight size={15} />
            </button>
          </motion.div>

          <motion.p
            {...fadeUp(0.70)}
            className="text-[10px] text-text-muted text-center mt-7 leading-relaxed"
          >
            Guest mode lets you search, stream, browse vibe playlists, and view spotlights for free.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
