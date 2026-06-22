import { motion } from 'framer-motion';

interface SkeletonProps {
  variant?: 'card' | 'list-item' | 'circle' | 'text' | 'mood-card';
  count?: number;
  className?: string;
}

function SkeletonBase({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface-light rounded-lg animate-shimmer ${className}`} />
  );
}

export function SkeletonLoader({ variant = 'card', count = 1, className = '' }: SkeletonProps) {
  const items = Array.from({ length: count });

  if (variant === 'circle') {
    return (
      <div className={`flex gap-4 ${className}`}>
        {items.map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <SkeletonBase className="!rounded-full w-16 h-16 md:w-20 md:h-20" />
            <SkeletonBase className="w-14 h-3" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list-item') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {items.map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <SkeletonBase className="w-12 h-12 shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <SkeletonBase className="w-3/4 h-4" />
              <SkeletonBase className="w-1/2 h-3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {items.map((_, i) => (
          <SkeletonBase key={i} className="w-full h-4" />
        ))}
      </div>
    );
  }

  if (variant === 'mood-card') {
    return (
      <div className={`flex gap-3 ${className}`}>
        {items.map((_, i) => (
          <SkeletonBase key={i} className="w-24 h-28 md:w-28 md:h-32 shrink-0 !rounded-2xl" />
        ))}
      </div>
    );
  }

  // card variant
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ${className}`}>
      {items.map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="flex flex-col gap-3"
        >
          <SkeletonBase className="aspect-square w-full" />
          <SkeletonBase className="w-3/4 h-4" />
          <SkeletonBase className="w-1/2 h-3" />
        </motion.div>
      ))}
    </div>
  );
}
