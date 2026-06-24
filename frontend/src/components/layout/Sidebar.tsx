import { Suspense, lazy } from 'react';
import { Home, Search, Library, Heart, ListMusic, LogOut, Disc3 } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { usePlayerStore } from '../../store/usePlayerStore';

const ASCIIText = lazy(() => import('../ASCIIText'));

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
      <div className="mb-8 px-3">
        <motion.div
          className="h-12 overflow-hidden rounded-2xl border border-[#D8B86A]/20 bg-[#080A0C]/80 shadow-[0_0_24px_rgba(216,184,106,0.12)]"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Suspense fallback={<div className="h-full w-full bg-[#0B0E10]" />}>
            <ASCIIText text="Sumic!" enableWaves asciiFontSize={6} textFontSize={120} planeBaseHeight={6} />
          </Suspense>
        </motion.div>
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
        <div className="mb-2 rounded-2xl border border-[#D8B86A]/20 bg-[#080A0C]/80 p-2 shadow-[0_0_22px_rgba(216,184,106,0.10)]">
          <div className="h-14 overflow-hidden rounded-xl">
            <Suspense fallback={<div className="h-full w-full bg-[#0B0E10]" />}>
              <ASCIIText text="Sumic!" enableWaves asciiFontSize={6} textFontSize={128} planeBaseHeight={6} />
            </Suspense>
          </div>
          <div className="mt-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#F6F1E7]">{isGuest ? 'Guest Profile' : 'Sumic Profile'}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#2ED3A2] shadow-[0_0_8px_rgba(46,211,162,0.7)]" />
          </div>
        </div>
        {!isGuest && (
          <div className="px-3 py-2 text-xs text-[#D8B86A] font-medium flex items-center gap-2">
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
