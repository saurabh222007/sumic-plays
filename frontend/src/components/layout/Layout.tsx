import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomPlayer } from './BottomPlayer';
import { useAuthStore } from '../../store/useAuthStore';
import { SumicAI } from '../SumicAI';

export function Layout() {
  const { isGuest, geminiApiKey } = useAuthStore();

  if (!isGuest && !geminiApiKey) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#202020] to-background pb-24 relative">
          <Outlet />
        </main>
      </div>
      <BottomPlayer />
      <SumicAI />
    </div>
  );
}
