import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

export function Auth() {
  const [apiKey, setApiKey] = useState('');
  const { loginWithKey, loginAsGuest } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      loginWithKey(apiKey.trim());
      navigate('/');
    }
  };

  const handleGuest = () => {
    loginAsGuest();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 z-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-primary rounded-full opacity-20"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: [null, Math.random() * -500],
              opacity: [0.2, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
            }}
          />
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 bg-[#121212] p-10 rounded-2xl border border-[#282828] shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-[0_0_20px_#1DB954]">
            <span className="text-black font-bold text-2xl">S</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-wider">Sumic</h1>
        </div>

        <h2 className="text-xl text-center text-text-secondary mb-8 font-medium">Your Music. Your Vibe.</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Gemini API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter key to unlock Sumic AI"
              className="w-full bg-[#1e1e1e] border border-[#333] rounded p-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-black font-bold py-3 rounded-full flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform cursor-pointer"
          >
            <Sparkles size={20} />
            Unlock AI Features
          </button>
        </form>

        <div className="mt-6 flex items-center gap-4">
          <div className="h-px bg-[#333] flex-1"></div>
          <span className="text-text-secondary text-sm">OR</span>
          <div className="h-px bg-[#333] flex-1"></div>
        </div>

        <button
          onClick={handleGuest}
          className="w-full mt-6 bg-transparent border border-text-secondary text-white font-bold py-3 rounded-full flex items-center justify-center gap-2 hover:border-white hover:bg-[#1a1a1a] transition cursor-pointer"
        >
          Continue as Guest
          <ArrowRight size={20} />
        </button>
      </motion.div>
    </div>
  );
}
