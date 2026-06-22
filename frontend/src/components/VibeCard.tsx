import { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAuthStore } from '../store/useAuthStore';
import { describeTrack } from '../lib/gemini';

export function VibeCard() {
  const { currentTrack } = usePlayerStore();
  const { geminiApiKey } = useAuthStore();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setText('');
    if (!currentTrack || !geminiApiKey) return;
    let cancelled = false;
    setLoading(true);
    describeTrack(geminiApiKey, currentTrack.title, currentTrack.artist)
      .then((d) => { if (!cancelled) setText(d); })
      .catch(() => { if (!cancelled) setText(''); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currentTrack, geminiApiKey]);

  if (!currentTrack || !geminiApiKey) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 glass border border-primary/20 shadow-glow-primary"
    >
      <div className="flex items-center gap-2 text-primary font-bold text-sm mb-2.5">
        <Sparkles size={16} className="animate-pulse" />
        <span className="uppercase tracking-widest">Vibe Check</span>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <Loader2 size={16} className="animate-spin text-primary" />
          <span>Reading the vibe...</span>
        </div>
      ) : (
        <p className="text-text-primary text-sm leading-relaxed font-medium">
          {text || 'No vibe read available.'}
        </p>
      )}
    </motion.div>
  );
}
