import { Home, Search, Library, Heart, ListMusic, LogOut, Disc3, Music2 } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { usePlayerStore } from '../../store/usePlayerStore';

export function Sidebar() {
  const { logout, isGuest } = useAuthStore();
  const { currentTrack } = usePlayerStore();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'favorites';
  const isFavoritesActive = location.pathname === '/library' && currentTab === 'favorites';
  const isPlaylistsActive = location.pathname === '/library' && currentTab === 'playlists';

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Disc3, label: 'Mood', path: '/mood' },
    { icon: Library, label: 'Your Library', path: '/library' },
  ];

  return (
    <div className="hidden md:flex w-[260px] h-full flex-col py-5 px-3 glass border-r border-glass-border select-none">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 px-3">
        <motion.div
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Music2 size={18} className="text-white" />
        </motion.div>
        <h1 className="text-xl font-extrabold gradient-text tracking-wider">Sumic</h1>
      </div>

      {/* Main Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'text-text-primary bg-primary/10 border border-primary/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={isActive ? 'text-primary' : 'group-hover:text-text-primary'} />
                <span className="font-semibold text-sm">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Divider */}
        <div className="my-4 mx-3 h-px bg-glass-border" />

        {/* Secondary Nav */}
        <NavLink
          to="/library?tab=favorites"
          className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
            isFavoritesActive
              ? 'text-text-primary bg-primary/10 border border-primary/20'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent'
          }`}
        >
          <Heart size={20} className={isFavoritesActive ? 'text-primary' : 'group-hover:text-text-primary'} />
          <span className="font-semibold text-sm">Favorites</span>
        </NavLink>
        <NavLink
          to="/library?tab=playlists"
          className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
            isPlaylistsActive
              ? 'text-text-primary bg-primary/10 border border-primary/20'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent'
          }`}
        >
          <ListMusic size={20} className={isPlaylistsActive ? 'text-primary' : 'group-hover:text-text-primary'} />
          <span className="font-semibold text-sm">Playlists</span>
        </NavLink>
      </nav>

      {/* Now Playing Mini */}
      {currentTrack && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-1 mb-3 p-3 rounded-xl bg-surface-light border border-glass-border"
        >
          <div className="flex items-center gap-3">
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="w-10 h-10 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">{currentTrack.title}</p>
              <p className="text-[10px] text-text-secondary truncate">{currentTrack.artist}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          </div>
        </motion.div>
      )}

      {/* Bottom */}
      <div className="flex flex-col gap-1 mx-1">
        {!isGuest && (
          <div className="px-3 py-2 text-xs text-primary font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            AI Active
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-200 text-text-muted hover:text-red-400 hover:bg-red-500/10 w-full text-left border border-transparent"
        >
          <LogOut size={18} />
          <span className="font-semibold text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
}
