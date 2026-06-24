import { Outlet, Navigate } from 'react-router-dom';
import { LayoutGroup } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { BottomPlayer } from './BottomPlayer';
import { MobileNav } from './MobileNav';
import { FullscreenPlayer } from './FullscreenPlayer';
import { useAuthStore } from '../../store/useAuthStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { DynamicMusicBackdrop } from '../DynamicMusicBackdrop';

export function Layout() {
  const { isGuest, geminiApiKey } = useAuthStore();
  const { currentTrack } = usePlayerStore();

  if (!isGuest && !geminiApiKey) {
    return <Navigate to="/login" replace />;
  }

  return (
    <LayoutGroup>
      <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
        <div className="fixed inset-0 pointer-events-none z-0">
          <DynamicMusicBackdrop track={currentTrack} intensity="subtle" />
        </div>

        <div className="flex-1 flex overflow-hidden relative z-10">
          <Sidebar />
          <main className="flex-1 overflow-y-auto relative">
            <div className="min-h-full pb-40 md:pb-28">
              <Outlet />
            </div>
          </main>
        </div>

        <BottomPlayer />
        <MobileNav />
        <FullscreenPlayer />
      </div>
    </LayoutGroup>
  );
}
