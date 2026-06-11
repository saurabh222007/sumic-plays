import { Home, Search, Library, Heart, ListMusic, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

export function Sidebar() {
  const { logout, isGuest } = useAuthStore();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Library, label: 'Your Library', path: '/library' },
  ];

  return (
    <div className="w-64 bg-surface h-full flex flex-col pt-6 pb-24 px-4 text-text-secondary select-none">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <span className="text-black font-bold">S</span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-wider">Sumic</h1>
      </div>

      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 px-2 py-2 rounded transition-colors duration-200 ${
                isActive ? 'text-white bg-[#282828]' : 'hover:text-white hover:bg-[#1a1a1a]'
              }`
            }
          >
            <item.icon size={24} />
            <span className="font-semibold text-sm">{item.label}</span>
          </NavLink>
        ))}

        <div className="mt-8 pt-4 border-t border-[#282828]">
          <NavLink
            to="/playlists"
            className="flex items-center gap-4 px-2 py-2 rounded transition-colors duration-200 hover:text-white hover:bg-[#1a1a1a]"
          >
            <ListMusic size={24} />
            <span className="font-semibold text-sm">Playlists</span>
          </NavLink>
          <NavLink
            to="/favorites"
            className="flex items-center gap-4 px-2 py-2 rounded transition-colors duration-200 hover:text-white hover:bg-[#1a1a1a]"
          >
            <Heart size={24} />
            <span className="font-semibold text-sm">Favorites</span>
          </NavLink>
        </div>
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        {!isGuest && (
          <div className="px-2 py-2 text-xs text-primary font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#1DB954]"></span>
            AI Active
          </div>
        )}
        <button 
          onClick={logout}
          className="flex items-center gap-4 px-2 py-2 rounded transition-colors duration-200 hover:text-white hover:bg-[#1a1a1a] w-full text-left"
        >
          <LogOut size={24} />
          <span className="font-semibold text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
}
