import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { usePlayerStore, type Track } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';

export function Home() {
  const [trending, setTrending] = useState<Track[]>([]);
  const { playTrack } = usePlayerStore();
  const { recent } = useLibraryStore();

  useEffect(() => {
    fetch('http://localhost:5000/api/music/search?q=top+hits+playlist')
      .then(res => res.json())
      .then(data => setTrending(data.slice(0, 6)))
      .catch(console.error);
  }, []);

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto w-full text-white">
      <h1 className="text-3xl font-bold mb-8">Good evening</h1>

      {recent.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Recently Played</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {recent.slice(0, 6).map((track, idx) => (
              <div 
                key={idx} 
                className="bg-surface/50 hover:bg-[#282828] transition flex items-center gap-4 rounded overflow-hidden group cursor-pointer"
                onClick={() => playTrack(track)}
              >
                <img src={track.thumbnail} alt={track.title} className="w-16 h-16 object-cover" />
                <span className="font-semibold truncate pr-4">{track.title}</span>
                <button className="ml-auto mr-4 bg-primary rounded-full p-3 opacity-0 group-hover:opacity-100 transition shadow-lg shadow-black/50 hover:scale-105">
                  <Play size={20} className="text-black fill-current ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-6">Trending Now</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {trending.map((track, idx) => (
            <div 
              key={idx} 
              className="bg-surface p-4 rounded-md hover:bg-[#282828] transition group cursor-pointer"
              onClick={() => playTrack(track)}
            >
              <div className="relative mb-4 aspect-square">
                <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover rounded shadow-md" />
                <button className="absolute bottom-2 right-2 bg-primary rounded-full p-3 opacity-0 group-hover:opacity-100 transition shadow-xl translate-y-2 group-hover:translate-y-0 hover:scale-105">
                  <Play size={20} className="text-black fill-current ml-0.5" />
                </button>
              </div>
              <h3 className="font-semibold truncate mb-1">{track.title}</h3>
              <p className="text-sm text-text-secondary truncate">{track.artist}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
