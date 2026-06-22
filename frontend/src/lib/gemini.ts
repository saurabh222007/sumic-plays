// Load GoogleGenerativeAI dynamically to avoid bundling/server-only runtime issues in the browser

// Try a conservative set of models. Some environments don't expose the pro/flash variants.
const MODEL_CANDIDATES = [
  'gemini-1.5',
  'gemini-1.0',
  'text-bison-001'
];

const STORAGE_KEY = 'sumic-working-gemini-model';

// Get last known working model or default to first candidate
function getCachedModelName(): string {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached && MODEL_CANDIDATES.includes(cached)) {
      return cached;
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return MODEL_CANDIDATES[0];
}

function setCachedModelName(modelName: string) {
  try {
    localStorage.setItem(STORAGE_KEY, modelName);
  } catch (e) {
    // Ignore
  }
}

async function runGenerativeContentWithFallback(apiKey: string, prompt: string): Promise<string> {
  let GoogleGenerativeAI: any;
  try {
    ({ GoogleGenerativeAI } = await import('@google/generative-ai'));
  } catch (err) {
    throw new Error('Generative AI client unavailable in this environment. AI features disabled.');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const cachedModel = getCachedModelName();
  
  // Helper to try a single model + apiVersion combination and return text or throw
  async function tryModel(modelName: string, apiVersion?: string) {
    const opts: any = { model: modelName };
    if (apiVersion) opts.requestOptions = { apiVersion };
    const model = genAI.getGenerativeModel(opts);
    const result = await model.generateContent(prompt);
    const text = result.response?.text?.();
    return text;
  }

  const tried: string[] = [];
  const errors: string[] = [];

  // Try cached model first with both common API versions
  if (cachedModel) {
    for (const ver of ['v1', 'v1beta']) {
      try {
        const text = await tryModel(cachedModel, ver);
        if (text) return text;
      } catch (err: any) {
        tried.push(`${cachedModel}@${ver}`);
        errors.push(`${cachedModel}@${ver}: ${err?.message || String(err)}`);
        if (err?.message?.toLowerCase()?.includes('not found') || err?.status === 404) {
          try { setCachedModelName(''); } catch {}
        }
      }
    }
  }

  // Try candidate models across API versions
  for (const modelName of MODEL_CANDIDATES) {
    // skip if same as cachedModel (we already tried)
    if (modelName === cachedModel) continue;
    for (const ver of ['v1', 'v1beta']) {
      try {
        const text = await tryModel(modelName, ver);
        if (text) {
          try { setCachedModelName(modelName); } catch {}
          return text;
        }
      } catch (err: any) {
        tried.push(`${modelName}@${ver}`);
        errors.push(`${modelName}@${ver}: ${err?.message || String(err)}`);
        // if model not found for this api/version, continue to next
        if (err?.message?.toLowerCase()?.includes('not found') || err?.status === 404) continue;
      }
    }
  }

  const message = `All Gemini models failed to generate content. Tried: ${tried.join(', ')}. Errors: ${errors.join(' | ')}. Check your API key and available models.`;
  const err = new Error(message);
  (err as any).details = errors;
  throw err;
}

export async function vibeToQueries(apiKey: string, vibe: string): Promise<string[]> {
  const prompt = `You are a music curator. The user described a vibe: "${vibe}".\n` +
    `Suggest 8 real, well-known songs that match this vibe.\n` +
    `Respond ONLY with a JSON array of strings in the format "Song Title - Artist". No prose, no markdown.`;
  
  const text = await runGenerativeContentWithFallback(apiKey, prompt);
  const cleaned = text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  
  try {
    const arr = JSON.parse(cleaned);
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === 'string').slice(0, 8);
  } catch {
    return cleaned.split('\n').map((l) => l.replace(/^[-*\d.\s]+/, '').trim()).filter(Boolean).slice(0, 8);
  }
  return [];
}

export async function describeTrack(apiKey: string, title: string, artist: string): Promise<string> {
  const prompt = `In 2-3 short, fun sentences, describe the vibe and meaning of the song "${title}" by ${artist}. ` +
    `Keep it casual and Gen-Z friendly. No markdown, no headings.`;
  
  const text = await runGenerativeContentWithFallback(apiKey, prompt);
  return text.trim();
}

export interface FeelingResult {
  mood: string;
  keywords: string[];
  playlistTheme: string;
  searchQueries: string[];
}

export async function interpretFeeling(apiKey: string, feeling: string): Promise<FeelingResult> {
  const prompt = `You are a mood interpreter for a music app. The user said: "${feeling}".
Interpret their emotional state and suggest music.
Respond ONLY with a JSON object (no markdown, no prose) in this exact format:
{
  "mood": "one-word mood label",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "playlistTheme": "a short playlist theme name",
  "searchQueries": ["search query 1", "search query 2", "search query 3", "search query 4", "search query 5"]
}

The searchQueries should be YouTube music search queries that would find songs matching this feeling.`;

  const text = await runGenerativeContentWithFallback(apiKey, prompt);
  const cleaned = text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  
  try {
    const result = JSON.parse(cleaned);
    return {
      mood: result.mood || 'Reflective',
      keywords: Array.isArray(result.keywords) ? result.keywords : [],
      playlistTheme: result.playlistTheme || 'Custom Mood Mix',
      searchQueries: Array.isArray(result.searchQueries) ? result.searchQueries.slice(0, 5) : [],
    };
  } catch {
    // Fallback
    return {
      mood: 'Mixed',
      keywords: [feeling],
      playlistTheme: 'Your Mood Mix',
      searchQueries: [`${feeling} songs`, `${feeling} playlist`, `${feeling} music`],
    };
  }
}

// If Gemini is not available for this environment, allow disabling AI features
const AI_DISABLED_KEY = 'sumic-ai-disabled';
export function disableAiFeatures() {
  try { localStorage.setItem(AI_DISABLED_KEY, '1'); } catch {}
}
export function isAiDisabled() {
  try { return localStorage.getItem(AI_DISABLED_KEY) === '1'; } catch { return false; }
}
