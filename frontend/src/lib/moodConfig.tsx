import type { ComponentType, SVGProps } from 'react';

// ─── Monochrome SVG Icon components ──────────────────────────────────────────
// All icons use white stroke, consistent 1.6 stroke-width, no fill

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconHappy({ size = 22, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <circle cx="9" cy="9" r="0.5" fill="currentColor" />
      <circle cx="15" cy="9" r="0.5" fill="currentColor" />
    </svg>
  );
}

function IconSad({ size = 22, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
      <circle cx="9" cy="9" r="0.5" fill="currentColor" />
      <circle cx="15" cy="9" r="0.5" fill="currentColor" />
    </svg>
  );
}

function IconRomantic({ size = 22, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function IconGym({ size = 22, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 5H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h3" />
      <path d="M18 5h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3" />
      <line x1="6" y1="9" x2="18" y2="9" />
      <line x1="6" y1="15" x2="18" y2="15" />
      <path d="M6 15h3a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H6" />
      <path d="M18 15h-3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3" />
    </svg>
  );
}

function IconDrive({ size = 22, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="8" width="20" height="9" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  );
}

function IconFocus({ size = 22, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconStudy({ size = 22, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function IconRain({ size = 22, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="8" y1="19" x2="8" y2="21" />
      <line x1="8" y1="13" x2="8" y2="15" />
      <line x1="16" y1="19" x2="16" y2="21" />
      <line x1="16" y1="13" x2="16" y2="15" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="12" y1="15" x2="12" y2="17" />
      <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
    </svg>
  );
}

function IconNight({ size = 22, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconMotivation({ size = 22, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconParty({ size = 22, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="12" y1="3" x2="12" y2="5" />
      <line x1="18.36" y1="5.64" x2="16.95" y2="7.05" />
      <line x1="21" y1="12" x2="19" y2="12" />
      <line x1="5" y1="12" x2="3" y2="12" />
      <line x1="7.05" y1="7.05" x2="5.64" y2="5.64" />
      <circle cx="12" cy="14" r="4" />
      <line x1="12" y1="18" x2="12" y2="21" />
      <line x1="9" y1="21" x2="15" y2="21" />
    </svg>
  );
}

// ─── Config type ──────────────────────────────────────────────────────────────
export interface MoodConfig {
  id: string;
  name: string;
  description: string;
  icon: ComponentType<IconProps>;
  gradient: string;
  color: string;
  searchQueries: string[];
  vibeType: 'aggressive' | 'emotional' | 'energetic' | 'neutral';
}

export const MOOD_CATEGORIES: MoodConfig[] = [
  {
    id: 'happy',
    name: 'Happy',
    description: 'Energize your day',
    icon: IconHappy,
    gradient: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08))',
    color: '#FBBF24',
    searchQueries: ['happy songs playlist', 'feel good music', 'upbeat pop songs', 'happy vibes playlist'],
    vibeType: 'energetic',
  },
  {
    id: 'sad',
    name: 'Sad',
    description: 'Let it all out',
    icon: IconSad,
    gradient: 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(59,130,246,0.08))',
    color: '#60A5FA',
    searchQueries: ['sad songs playlist', 'emotional ballads', 'heartbreak songs', 'melancholy music'],
    vibeType: 'emotional',
  },
  {
    id: 'romantic',
    name: 'Romantic',
    description: 'Feel the love',
    icon: IconRomantic,
    gradient: 'linear-gradient(135deg, rgba(244,114,182,0.15), rgba(236,72,153,0.08))',
    color: '#F472B6',
    searchQueries: ['romantic songs', 'love songs playlist', 'romantic bollywood songs', 'love ballads'],
    vibeType: 'emotional',
  },
  {
    id: 'gym',
    name: 'Gym',
    description: 'Push your limits',
    icon: IconGym,
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.08))',
    color: '#EF4444',
    searchQueries: ['gym workout music', 'pump up songs', 'workout playlist', 'high energy gym'],
    vibeType: 'aggressive',
  },
  {
    id: 'drive',
    name: 'Drive',
    description: 'Hit the open road',
    icon: IconDrive,
    gradient: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.08))',
    color: '#F97316',
    searchQueries: ['driving songs playlist', 'road trip music', 'night drive songs', 'car music bass'],
    vibeType: 'energetic',
  },
  {
    id: 'focus',
    name: 'Focus',
    description: 'Deep concentration',
    icon: IconFocus,
    gradient: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(8,145,178,0.08))',
    color: '#06B6D4',
    searchQueries: ['focus music', 'concentration music', 'deep focus playlist', 'instrumental focus'],
    vibeType: 'neutral',
  },
  {
    id: 'study',
    name: 'Study',
    description: 'Learn in flow state',
    icon: IconStudy,
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(124,58,237,0.08))',
    color: '#8B5CF6',
    searchQueries: ['study music playlist', 'lofi study beats', 'study concentration music', 'ambient study'],
    vibeType: 'neutral',
  },
  {
    id: 'rain',
    name: 'Rain',
    description: 'Cozy rainy days',
    icon: IconRain,
    gradient: 'linear-gradient(135deg, rgba(100,116,139,0.15), rgba(71,85,105,0.08))',
    color: '#64748B',
    searchQueries: ['rainy day songs', 'rain and music', 'chill rain playlist', 'cozy rain songs'],
    vibeType: 'emotional',
  },
  {
    id: 'night',
    name: 'Night',
    description: 'Midnight wandering',
    icon: IconNight,
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.08))',
    color: '#6366F1',
    searchQueries: ['late night songs', 'night vibes playlist', 'midnight music', 'after hours songs'],
    vibeType: 'emotional',
  },
  {
    id: 'motivation',
    name: 'Motivation',
    description: 'Rise and conquer',
    icon: IconMotivation,
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.08))',
    color: '#F59E0B',
    searchQueries: ['motivational songs', 'motivation playlist', 'powerful songs', 'inspirational music'],
    vibeType: 'aggressive',
  },
  {
    id: 'party',
    name: 'Party',
    description: 'Turn it up loud',
    icon: IconParty,
    gradient: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(219,39,119,0.08))',
    color: '#EC4899',
    searchQueries: ['party songs playlist', 'dance music', 'party hits', 'club bangers'],
    vibeType: 'energetic',
  },
];

export function getMoodById(id: string): MoodConfig | undefined {
  return MOOD_CATEGORIES.find(m => m.id === id);
}
