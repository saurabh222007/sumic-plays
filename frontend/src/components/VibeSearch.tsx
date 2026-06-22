import { useState } from 'react';
import { API_URL } from '../config';
import { Sparkles, Loader2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore, type Track } from '../store/usePlayerStore';
import { useAuthStore } from '../store/useAuthStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { vibeToQueries } from '../lib/gemini';
const SUGGESTIONS = ['3am coding', 'gym beast mode', 'sad girl autumn', 'main character energy', 'lofi study'];
export function VibeSearch() {
  const [vibe, setVibe] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const { geminiApiKey } = useAuthStore();
  const { playQueue } = usePlayerStore();
  const { addRecent } = useLibraryStore();

  const runVibe = async (text: string) => {
    if (!text.trim()) return;
    setError('');
    if (!geminiApiKey) {
      setError('Add your Gemini API key (log in with a key) to unlock AI Vibe Search.');
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const queries = await vibeToQueries(geminiApiKey, text);
      if (!queries || queries.length === 0) {
        setError('AI failed to generate search queries. Try a different vibe.');
        setLoading(false);
        return;
      }

      const tracks = await Promise.all(
        queries.map(async (q) => {
          try {
            const res = await fetch(`${API_URL}/api/music/search?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(8000) });
            if (!res.ok) return null;
            const data = await res.json();
            return Array.isArray(data) && data.length ? (data[0] as Track) : null;
          } catch (err) {
            console.error(`Search error for query "${q}":`, err);
            return null;
          }
        })
      );
      
      const valid = tracks.filter((t): t is Track => !!t);
      if (!valid.length) {
        setError('Could not build a queue for that vibe. Try rephrasing it.');
      } else {
        setResults(valid);
        playQueue(valid, 0);
        addRecent(valid[0]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setError(`AI error: ${msg}. Check your API key.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative rounded-3xl p-6 md:p-8 mb-8 overflow-hidden glass border border-primary/20 shadow-glow-primary">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2 text-primary font-bold">
          <Sparkles size={18} className="animate-pulse" />
          <span className="text-xs uppercase tracking-widest">AI Vibe Search</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary mb-4">What's your vibe?</h2>

        <form
          onSubmit={(e) => { e.preventDefault(); runVibe(vibe); }}
          className="flex flex-col sm:flex-row gap-3 max-w-2xl"
        >
          <input
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            placeholder="Describe a mood, scene, or feeling..."
            className="flex-1 bg-surface-light hover:bg-surface-hover rounded-2xl px-5 py-3.5 text-text-primary outline-none border border-glass-border focus:border-primary transition placeholder:text-text-muted text-sm md:text-base"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary-light text-black font-extrabold px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-75 cursor-pointer text-sm md:text-base shrink-0"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {loading ? 'Building...' : 'Make Queue'}
          </button>
        </form>

        <div className="flex flex-wrap gap-2 mt-4">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setVibe(s); runVibe(s); }}
              className="text-xs bg-surface-light hover:bg-surface-hover hover:text-text-primary text-text-secondary px-3.5 py-2 rounded-full border border-glass-border transition cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-red-400 mt-4 font-semibold">{error}</p>}

        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 border-t border-glass-border pt-5"
            >
              <p className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-3">AI-Built Queue · Playing Now</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {results.map((t, i) => (
                  <button
                    key={t.id + i}
                    onClick={() => { playQueue(results, i); addRecent(results[i]); }}
                    className="flex items-center gap-3 bg-surface-light hover:bg-surface-hover rounded-xl p-2.5 text-left transition group border border-glass-border"
                  >
                    <img src={t.thumbnail} alt={t.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    <span className="text-text-primary text-sm font-semibold truncate flex-1">{t.title}</span>
                    <Play size={16} className="text-primary opacity-0 group-hover:opacity-100 transition" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
