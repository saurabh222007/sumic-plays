import { useState } from 'react';
import { Search as SearchIcon, Play, Clock } from 'lucide-react';
import { usePlayerStore, type Track } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';

export function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const { playTrack } = usePlayerStore();
  const { addRecent } = useLibraryStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/music/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (track: Track) => {
    playTrack(track);
    addRecent(track);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto w-full text-white">
      <form onSubmit={handleSearch} className="relative w-full max-w-2xl mb-12">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={24} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to listen to?"
          className="w-full bg-surface hover:bg-[#282828] focus:bg-[#282828] transition-colors rounded-full py-4 pl-14 pr-6 text-white outline-none focus:ring-2 focus:ring-primary border border-transparent"
        />
      </form>

      {loading && (
        <div className="flex justify-center mt-20">
          <div className="w-10 h-10 border-4 border-[#333] border-t-primary rounded-full animate-spin"></div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Top Results</h2>
          <div className="grid gap-2">
            {results.map((track, idx) => (
              <div 
                key={track.id + idx}
                className="flex items-center justify-between p-3 rounded-md hover:bg-[#282828] group transition-colors cursor-pointer"
                onDoubleClick={() => handlePlay(track)}
              >
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12">
                    <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover rounded" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); handlePlay(track); }}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Play size={20} className="text-white fill-current" />
                    </button>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium truncate max-w-md">{track.title}</span>
                    <span className="text-sm text-text-secondary">{track.artist}</span>
                  </div>
                </div>
                <div className="flex items-center text-text-secondary gap-8 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    <span>{formatDuration(track.duration)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <div className="text-center mt-20 text-text-secondary">
          <p className="text-lg">No results found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
