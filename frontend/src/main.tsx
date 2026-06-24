import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import playerEngine from './lib/playerEngine';
import { usePlayerStore } from './store/usePlayerStore';

// Preload YouTube API and shared player early to reduce playback startup latency
void (async () => {
  try {
    await playerEngine.prewarm();
  } catch (e) {
    console.warn('Prewarm failed', e);
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Global keyboard shortcuts for playback control
window.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;
  const s = usePlayerStore.getState();
  if (e.code === 'Space') {
    e.preventDefault();
    s.setPlaying(!s.isPlaying);
    return;
  }
  if (e.code === 'ArrowRight' && e.ctrlKey) {
    e.preventDefault();
    void s.nextTrack();
    return;
  }
  if (e.code === 'ArrowLeft' && e.ctrlKey) {
    e.preventDefault();
    s.prevTrack();
    return;
  }
  if (e.code === 'ArrowRight') {
    e.preventDefault();
    const t = Math.min((s.currentTrack?.duration || 0), s.progress + 5);
    s.seek(t);
    return;
  }
  if (e.code === 'ArrowLeft') {
    e.preventDefault();
    const t = Math.max(0, s.progress - 5);
    s.seek(t);
    return;
  }
  if (e.key.toLowerCase() === 'm') {
    e.preventDefault();
    const vol = s.volume || 0;
    if (vol > 0) {
      try { localStorage.setItem('sumic_last_volume', String(vol)); } catch (err) {}
      s.setVolume(0);
    } else {
      const last = Number(localStorage.getItem('sumic_last_volume') || '0.8');
      s.setVolume(last || 0.8);
    }
    return;
  }
});
