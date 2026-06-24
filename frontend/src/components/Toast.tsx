import { useUIStore } from '../store/useUIStore';

export function Toasts() {
  const toasts = useUIStore((s) => s.toasts);
  const remove = useUIStore((s) => s.removeToast);
  return (
    <div className="fixed bottom-20 right-4 z-60 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto bg-black/85 text-white text-sm px-4 py-2 rounded-lg shadow-lg border border-white/5">
          <div className="flex items-center justify-between gap-2">
            <div>{t.message}</div>
            <button onClick={() => remove(t.id)} className="ml-4 text-white/60 hover:text-white">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Toasts;
