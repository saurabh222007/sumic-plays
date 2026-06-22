import { motion } from 'framer-motion';
import { MOOD_CATEGORIES } from '../lib/moodConfig';
import { MoodCard } from '../components/MoodCard';
import { Sparkles } from 'lucide-react';

export function MoodBrowser() {
  return (
    <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={18} className="text-primary animate-pulse" />
          <span className="text-xs uppercase tracking-widest text-primary font-bold">Vibe Categories</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-extrabold text-text-primary tracking-tight">
          How's your mood?
        </h1>
        <p className="text-sm md:text-base text-text-secondary mt-1.5">
          Select a category to generate a playlist tailored to your current energy.
        </p>
      </motion.div>

      {/* 2-column pill grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MOOD_CATEGORIES.map((mood, idx) => (
          <MoodCard key={mood.id} mood={mood} index={idx} />
        ))}
      </div>
    </div>
  );
}
