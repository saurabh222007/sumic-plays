import { usePlayerStore } from '../store/usePlayerStore';
import playerEngine from '../lib/playerEngine';
import useUIStore from '../store/useUIStore';
import { API_URL } from '../config';

export function ClickToEnableOverlay() {
  const playBlocked = usePlayerStore((s) => s.playBlocked);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const setPlayBlocked = usePlayerStore((s) => s.setPlayBlocked);
  const addToast = useUIStore((s) => s.addToast);

  if (!playBlocked || !currentTrack) return null;

  const handleEnable = async () => {
    try {
      const stream = `${API_URL}/api/music/stream/${currentTrack.id}`;
      // Try to load and play with this user gesture
      await playerEngine.load(currentTrack, stream);
      await playerEngine.play();
      setPlayBlocked(false);
      addToast('Playback enabled', 2000);
    } catch (e) {
      addToast('Could not start playback. Tap again.', 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-auto">
      <div className="bg-gradient-to-t from-black/70 to-transparent w-full p-6 md:rounded-none md:w-auto md:max-w-md mx-4 md:mx-0">
        <div className="text-white text-center">
          <div className="mb-2 font-semibold">Tap to enable audio</div>
          <div className="text-sm opacity-80 mb-4">Your browser blocked autoplay. Tap to allow playback for the current track.</div>
          <button onClick={handleEnable} className="px-6 py-2 bg-white text-black rounded-lg font-medium">Enable playback</button>
        </div>
      </div>
    </div>
  );
}

export default ClickToEnableOverlay;
