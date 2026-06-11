import { useState } from 'react';
import { Bot, Mic, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { usePlayerStore } from '../store/usePlayerStore';

export function SumicAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user'|'ai', content: string}[]>([
    { role: 'ai', content: 'Hi! I am Sumic AI. Tell me what to play, like "Play workout music" or "Pause the player".' }
  ]);
  const { geminiApiKey } = useAuthStore();
  const { setPlaying, setVolume } = usePlayerStore();
  
  const handleCommand = async (text: string) => {
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    
    if (!geminiApiKey) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Gemini API key is missing. Please log in with a key to use AI features.' }]);
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `
        You are Sumic AI, a music player assistant.
        The user said: "${text}"
        If it's a playback command, reply exactly with one of these actions: 
        [ACTION:PAUSE], [ACTION:PLAY], [ACTION:VOLUME:number] (0-100)
        If it's a search command (e.g., "Play Believer"), reply with: [ACTION:SEARCH:query]
        If it's just a conversational query, reply normally.
      `;
      
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      if (responseText.includes('[ACTION:PAUSE]')) {
        setPlaying(false);
        setMessages(prev => [...prev, { role: 'ai', content: 'Paused the music.' }]);
      } else if (responseText.includes('[ACTION:PLAY]')) {
        setPlaying(true);
        setMessages(prev => [...prev, { role: 'ai', content: 'Resuming playback.' }]);
      } else if (responseText.match(/\[ACTION:VOLUME:(\d+)\]/)) {
        const match = responseText.match(/\[ACTION:VOLUME:(\d+)\]/);
        const vol = parseInt(match![1]) / 100;
        setVolume(vol);
        setMessages(prev => [...prev, { role: 'ai', content: `Set volume to ${match![1]}%.` }]);
      } else if (responseText.match(/\[ACTION:SEARCH:(.+?)\]/)) {
        const match = responseText.match(/\[ACTION:SEARCH:(.+?)\]/);
        const query = match![1];
        setMessages(prev => [...prev, { role: 'ai', content: `Searching for: ${query}.` }]);
        fetch(`http://localhost:5000/api/music/search?q=${encodeURIComponent(query)}`)
          .then(res => res.json())
          .then(data => {
            if(data.length > 0) usePlayerStore.getState().playTrack(data[0]);
          });
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: responseText }]);
      }
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', content: `API Error: ${error?.message || 'Invalid API Key or connection issue.'}` }]);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-28 right-8 bg-primary text-black p-4 rounded-full shadow-[0_0_20px_rgba(29,185,84,0.4)] hover:scale-110 transition z-40"
      >
        <Bot size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-28 right-8 w-96 bg-surface border border-[#333] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
            style={{ maxHeight: '600px', height: '80vh' }}
          >
            <div className="p-4 bg-[#202020] border-b border-[#333] flex justify-between items-center">
              <div className="flex items-center gap-2 text-white font-bold">
                <Bot size={20} className="text-primary" />
                Sumic AI
              </div>
              <button onClick={() => setIsOpen(false)} className="text-text-secondary hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' ? 'bg-primary text-black rounded-tr-none' : 'bg-[#282828] text-white rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-[#202020] border-t border-[#333]">
              <form 
                onSubmit={(e) => { e.preventDefault(); if (input) handleCommand(input); }}
                className="flex items-center gap-2"
              >
                <button type="button" className="text-text-secondary hover:text-white p-2">
                  <Mic size={20} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask Sumic AI..."
                  className="flex-1 bg-background rounded-full px-4 py-2 text-white text-sm focus:outline-none border border-[#333] focus:border-primary"
                />
                <button type="submit" className="bg-primary text-black p-2 rounded-full hover:scale-105 transition">
                  <Send size={16} className="ml-1" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
