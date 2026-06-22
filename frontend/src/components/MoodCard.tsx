import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { MoodConfig } from '../lib/moodConfig';

interface MoodCardProps {
  mood: MoodConfig;
  index?: number;
}

export function MoodCard({ mood, index = 0 }: MoodCardProps) {
  const navigate = useNavigate();
  const Icon = mood.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -3, scale: 1.015 }}
      whileTap={{ scale: 0.965 }}
      onClick={() => navigate(`/mood/${mood.id}`)}
      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border border-white/8 cursor-pointer text-left group relative overflow-hidden"
      style={{ background: mood.gradient }}
    >
      {/* Subtle hover shimmer */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)' }}
      />

      {/* Icon container */}
      <motion.div
        className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border border-white/10 relative"
        style={{ background: `${mood.color}18`, boxShadow: `0 0 12px ${mood.color}20` }}
        whileHover={{ boxShadow: `0 0 20px ${mood.color}50` }}
        transition={{ duration: 0.2 }}
      >
        <Icon
          size={21}
          className="transition-all duration-200 group-hover:scale-110"
          style={{ color: mood.color }}
        />
      </motion.div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text-primary leading-tight truncate group-hover:text-white transition-colors duration-200">
          {mood.name}
        </p>
        <p className="text-xs text-text-muted mt-0.5 truncate">
          {mood.description}
        </p>
      </div>

      {/* Arrow indicator */}
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4 text-text-muted shrink-0 opacity-0 group-hover:opacity-60 transition-all duration-200 translate-x-1 group-hover:translate-x-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </motion.button>
  );
}
