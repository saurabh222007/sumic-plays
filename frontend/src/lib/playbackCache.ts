const STORAGE_KEY = 'playbackCache:v1';
const TTL = 1000 * 60 * 60 * 24; // 24h

export interface CacheEntry {
  id: string;
  videoId?: string;
  duration?: number;
  thumbnail?: string;
  capability?: 'audio' | 'youtube' | 'unknown';
  updatedAt: number;
}

let inMemory = new Map<string, CacheEntry>();

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, CacheEntry>;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (Date.now() - (v.updatedAt || 0) < TTL) inMemory.set(k, v);
    }
  } catch (e) {}
}

function persist() {
  try {
    const obj: Record<string, CacheEntry> = {};
    for (const [k, v] of inMemory.entries()) obj[k] = v;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {}
}

export function getCache(id: string): CacheEntry | null {
  if (inMemory.size === 0) loadFromStorage();
  const v = inMemory.get(id);
  if (!v) return null;
  if (Date.now() - v.updatedAt > TTL) {
    inMemory.delete(id);
    persist();
    return null;
  }
  return v;
}

export function setCache(id: string, entry: Partial<CacheEntry>) {
  const prev = inMemory.get(id) || { id, updatedAt: 0 } as CacheEntry;
  const merged = { ...prev, ...entry, id, updatedAt: Date.now() } as CacheEntry;
  inMemory.set(id, merged);
  persist();
}

export function clearCache() { inMemory.clear(); try { localStorage.removeItem(STORAGE_KEY); } catch(e) {} }
