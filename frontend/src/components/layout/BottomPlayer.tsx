import { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Mic2 } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

export function BottomPlayer() {
  const { currentTrack, isPlaying, volume, progress, setPlaying, setProgress, nextTrack, prevTrack } = usePlayerStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.play().catch(e => console.error("Playback failed", e));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    nextTrack();
  };

  const togglePlay = () => {
    if (!currentTrack) return;
    setPlaying(!isPlaying);
  };

  if (!currentTrack) return (
    <div className="h-24 bg-surface border-t border-[#282828] fixed bottom-0 w-full z-50 flex items-center justify-center text-text-secondary text-sm">
      Sumic AI Player
    </div>
  );

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-24 bg-surface border-t border-[#282828] flex items-center justify-between px-4 fixed bottom-0 w-full z-50">
      <audio
        ref={audioRef}
        src={`http://localhost:5000/api/music/stream/${currentTrack.id}`}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        autoPlay={isPlaying}
      />
      
      {/* Left: Track Info */}
      <div className="flex items-center gap-4 w-1/3 min-w-[200px]">
        <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-14 h-14 object-cover rounded" />
        <div className="flex flex-col overflow-hidden">
          <span className="text-white text-sm font-semibold truncate hover:underline cursor-pointer">{currentTrack.title}</span>
          <span className="text-text-secondary text-xs truncate hover:underline cursor-pointer">{currentTrack.artist}</span>
        </div>
      </div>

      {/* Center: Controls */}
      <div className="flex flex-col items-center justify-center w-1/3 gap-2">
        <div className="flex items-center gap-6">
          <button onClick={prevTrack} className="text-text-secondary hover:text-white transition">
            <SkipBack size={20} className="fill-current" />
          </button>
          <button 
            onClick={togglePlay} 
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition"
          >
            {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current ml-0.5" />}
          </button>
          <button onClick={nextTrack} className="text-text-secondary hover:text-white transition">
            <SkipForward size={20} className="fill-current" />
          </button>
        </div>
        <div className="flex items-center gap-2 w-full max-w-[400px]">
          <span className="text-xs text-text-secondary w-10 text-right">{formatTime(progress)}</span>
          <div className="h-1 bg-[#4d4d4d] rounded-full flex-1 relative group cursor-pointer" onClick={(e) => {
            if (audioRef.current && currentTrack) {
              const bounds = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - bounds.left) / bounds.width;
              audioRef.current.currentTime = percent * currentTrack.duration;
              setProgress(audioRef.current.currentTime);
            }
          }}>
            <div 
              className="h-full bg-primary rounded-full absolute left-0 top-0 group-hover:bg-[#1ed760]" 
              style={{ width: `${currentTrack.duration ? (progress / currentTrack.duration) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-text-secondary w-10">{formatTime(currentTrack.duration)}</span>
        </div>
      </div>

      {/* Right: Extra Controls */}
      <div className="flex items-center justify-end w-1/3 gap-4 min-w-[200px] text-text-secondary">
        <button className="hover:text-white transition">
          <Mic2 size={20} />
        </button>
        <div className="flex items-center gap-2 w-24">
          <Volume2 size={20} />
          <div className="h-1 bg-[#4d4d4d] rounded-full flex-1">
            <div className="h-full bg-white rounded-full w-[100%]" />
          </div>
        </div>
      </div>
    </div>
  );
}
