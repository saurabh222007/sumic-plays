import { create } from 'zustand';

export type VibeType = 'aggressive' | 'emotional' | 'energetic' | 'neutral';

interface VibeState {
  currentVibe: VibeType;
  vibeColor: string;
  vibeIntensity: number; // 0-1
  setVibe: (vibe: VibeType) => void;
  setVibeColor: (color: string) => void;
  setVibeIntensity: (intensity: number) => void;
  detectVibeFromKeywords: (title: string, artist: string) => void;
}

// Keyword-based vibe detection (no AI needed)
const AGGRESSIVE_KEYWORDS = ['rap', 'drill', 'gym', 'workout', 'beast', 'power', 'hype', 'rage', 'angry', 'fight', 'war', 'gangsta', 'hard', 'metal', 'punk', 'sidhu', 'moosewala', 'eminem', 'kendrick'];
const EMOTIONAL_KEYWORDS = ['love', 'heart', 'romantic', 'sad', 'cry', 'miss', 'lonely', 'pain', 'slow', 'ballad', 'rain', 'night', 'acoustic', 'arijit', 'adele', 'ed sheeran', 'breakup', 'emotional'];
const ENERGETIC_KEYWORDS = ['party', 'dance', 'edm', 'club', 'bass', 'drop', 'energy', 'bounce', 'electro', 'dj', 'rave', 'festival', 'drive', 'speed', 'fast', 'pop', 'upbeat'];

function detectVibe(title: string, artist: string): { vibe: VibeType; color: string } {
  const text = `${title} ${artist}`.toLowerCase();

  let aggressiveScore = 0;
  let emotionalScore = 0;
  let energeticScore = 0;

  for (const kw of AGGRESSIVE_KEYWORDS) {
    if (text.includes(kw)) aggressiveScore++;
  }
  for (const kw of EMOTIONAL_KEYWORDS) {
    if (text.includes(kw)) emotionalScore++;
  }
  for (const kw of ENERGETIC_KEYWORDS) {
    if (text.includes(kw)) energeticScore++;
  }

  const max = Math.max(aggressiveScore, emotionalScore, energeticScore);
  if (max === 0) return { vibe: 'neutral', color: '#8B5CF6' };

  if (aggressiveScore === max) return { vibe: 'aggressive', color: '#EF4444' };
  if (emotionalScore === max) return { vibe: 'emotional', color: '#60A5FA' };
  return { vibe: 'energetic', color: '#F59E0B' };
}

export const useVibeStore = create<VibeState>((set) => ({
  currentVibe: 'neutral',
  vibeColor: '#8B5CF6',
  vibeIntensity: 0.5,

  setVibe: (vibe) => set({ currentVibe: vibe }),
  setVibeColor: (color) => set({ vibeColor: color }),
  setVibeIntensity: (intensity) => set({ vibeIntensity: Math.max(0, Math.min(1, intensity)) }),

  detectVibeFromKeywords: (title, artist) => {
    const { vibe, color } = detectVibe(title, artist);
    set({ currentVibe: vibe, vibeColor: color });
  },
}));
