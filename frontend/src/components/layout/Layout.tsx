import { Outlet, Navigate } from 'react-router-dom';
import { LayoutGroup } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { BottomPlayer } from './BottomPlayer';
import { MobileNav } from './MobileNav';
import { FullscreenPlayer } from './FullscreenPlayer';
import { useAuthStore } from '../../store/useAuthStore';

export function Layout() {
  const { isGuest, geminiApiKey } = useAuthStore();

  if (!isGuest && !geminiApiKey) {
    return <Navigate to="/login" replace />;
  }

  return (
    <LayoutGroup>
      <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
        {/* Subtle ambient gradient */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px]" />
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
