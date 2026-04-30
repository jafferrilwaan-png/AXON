import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Activity, FileText, TrendingUp, Send, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatWithAxon } from '../lib/gemini';

const BotIcon = ({ cursorPosition, isOpen }: { cursorPosition: {x: number, y: number}, isOpen: boolean }) => {
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const botRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (botRef.current && !isOpen) {
      const rect = botRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = cursorPosition.x - centerX;
      const deltaY = cursorPosition.y - centerY;
      
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const angle = Math.atan2(deltaY, deltaX);
      
      const maxOffset = 5;
      const distanceFactor = Math.min(distance / 400, 1);
      
      setEyeOffset({
        x: Math.cos(angle) * maxOffset * distanceFactor,
        y: Math.sin(angle) * maxOffset * distanceFactor,
      });
    } else if (isOpen) {
        setEyeOffset({ x: 0, y: 0 });
    }
  }, [cursorPosition, isOpen]);

  return (
    <div ref={botRef} className="w-12 h-12 flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]">
        <rect x="20" y="25" width="60" height="50" rx="15" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
        <rect x="28" y="38" width="44" height="24" rx="8" fill="#020617" />
        
        {/* Glow behind eyes */}
        <circle cx={38 + eyeOffset.x} cy={50 + eyeOffset.y} r="5" fill="#38bdf8" opacity="0.4" className="transition-all duration-100 ease-out" />
        <circle cx={62 + eyeOffset.x} cy={50 + eyeOffset.y} r="5" fill="#38bdf8" opacity="0.4" className="transition-all duration-100 ease-out" />

        <circle cx={38 + eyeOffset.x} cy={50 + eyeOffset.y} r="2.5" fill="#fff" className="transition-all duration-100 ease-out drop-shadow-[0_0_2px_#fff]" />
        <circle cx={62 + eyeOffset.x} cy={50 + eyeOffset.y} r="2.5" fill="#fff" className="transition-all duration-100 ease-out drop-shadow-[0_0_2px_#fff]" />
        
        <path d="M48,82 h4 v-4 h4 v-4 h-4 v-4 h-4 v4 h-4 v4 h4 z" fill="#38bdf8" />
        <path d="M35,25 v-8 h30 v8" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" />
        <circle cx="50" cy="17" r="3" fill="#2dd4bf" className="animate-pulse drop-shadow-[0_0_4px_#2dd4bf]" />
      </svg>
    </div>
  )
}

export const AxonAIBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<{role: string, text: string}[]>([
    { role: 'model', text: "How can I assist with this patient's longitudinal record today?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!user) return null;

  const handleSend = async (e?: React.FormEvent, preset?: string) => {
    e?.preventDefault();
    const query = preset || userQuery;
    if (!query.trim() || isTyping) return;

    const newMessages = [...messages, { role: 'user', text: query }];
    setMessages(newMessages);
    if (!preset) setUserQuery('');
    setIsTyping(true);

    try {
      const response = await chatWithAxon(messages, query);
      setMessages([...newMessages, { role: 'model', text: response }]);
    } catch (error: any) {
      console.error("Chat Error:", error);
      const errorMsg = error?.message || "";
      if (errorMsg.includes("QUOTA") || errorMsg.includes("429") || errorMsg.includes("exhausted")) {
        setMessages([...newMessages, { role: 'model', text: "AXON ALERT: Clinical processing quota exceeded. My neural cores are currently cooling down to stay within safety limits. Please try again later or check your dashboard for cached insights." }]);
      } else {
        setMessages([...newMessages, { role: 'model', text: "I'm currently unable to process your request securely due to a technical handshake error. Please try again." }]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <motion.div
        className={`absolute pointer-events-auto flex items-center justify-center cursor-pointer group shadow-2xl transition-colors ${isOpen ? 'active bg-slate-800' : 'bg-slate-900 border border-brand-blue/30'}`}
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          boxShadow: isOpen ? '0 0 20px rgba(56,189,248,0.2)' : '0 0 30px rgba(56,189,248,0.4)',
        }}
        onClick={() => !isOpen && setIsOpen(true)}
        animate={{
          x: isOpen ? window.innerWidth - 380 : window.innerWidth - 90 - (window.innerWidth - cursorPosition.x) * 0.015, 
          y: isOpen ? window.innerHeight - 560 : window.innerHeight - 90 - (window.innerHeight - cursorPosition.y) * 0.015,
          transition: { type: 'spring', stiffness: 45, damping: 25 },
        }}
      >
        {!isOpen && (
          <div className="absolute right-full mr-4 whitespace-nowrap bg-slate-900 border border-brand-blue/30 px-4 py-2 rounded-xl text-sm font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_15px_rgba(56,189,248,0.3)] backdrop-blur-md">
            AXON Assistant
          </div>
        )}
        <BotIcon cursorPosition={cursorPosition} isOpen={isOpen} />
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute pointer-events-auto w-[360px] bg-slate-900/95 backdrop-blur-xl border border-brand-blue/30 rounded-2xl shadow-[0_0_40px_rgba(52,144,220,0.2)] flex flex-col overflow-hidden"
            style={{
              left: window.innerWidth - 380,
              top: window.innerHeight - 560,
              height: 520
            }}
            initial={{ opacity: 0, scale: 0.8, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between p-4 border-b border-brand-blue/20 bg-slate-950/80 shadow-md z-10 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/5 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 relative">
                <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center border border-brand-blue/30">
                  <BotIcon cursorPosition={cursorPosition} isOpen={isOpen} />
                </div>
                <div>
                  <h3 className="font-bold text-white tracking-tight">AXON Clinical Assistant</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">Online & Secure</span>
                  </div>
                </div>
              </div>
              <button 
                className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10 relative z-10" 
                onClick={() => setIsOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
              {messages.map((ms, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${ms.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-md box-border ${
                    ms.role === 'user' 
                      ? 'bg-brand-blue text-white rounded-tr-sm border border-blue-400/50' 
                      : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-tl-sm'
                  }`}>
                    {ms.text}
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] p-4 rounded-2xl rounded-tl-sm bg-slate-800 border border-slate-700/80 shadow-md">
                    <div className="flex gap-1.5 items-center">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                </div>
              )}
              
              {messages.length === 1 && !isTyping && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="flex flex-col gap-2 mt-[2rem!important]"
                >
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">Suggested Clinical Tasks</span>
                  <button onClick={() => handleSend(undefined, "View Lab Trends")} className="flex items-center gap-3 text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-brand-blue/10 hover:border-brand-blue/30 hover:shadow-[0_0_15px_rgba(52,144,220,0.15)] transition-all text-sm text-slate-300 group">
                    <TrendingUp className="w-4 h-4 text-brand-blue/70 group-hover:text-brand-blue" />
                    View Lab Trends
                  </button>
                  <button onClick={() => handleSend(undefined, "Synthesize Clinical History")} className="flex items-center gap-3 text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-brand-blue/10 hover:border-brand-blue/30 hover:shadow-[0_0_15px_rgba(52,144,220,0.15)] transition-all text-sm text-slate-300 group">
                    <FileText className="w-4 h-4 text-brand-blue/70 group-hover:text-brand-blue" />
                    Synthesize Clinical History
                  </button>
                  <button onClick={() => handleSend(undefined, "Analyze Vitals")} className="flex items-center gap-3 text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-brand-blue/10 hover:border-brand-blue/30 hover:shadow-[0_0_15px_rgba(52,144,220,0.15)] transition-all text-sm text-slate-300 group">
                    <Activity className="w-4 h-4 text-brand-blue/70 group-hover:text-brand-blue" />
                    Analyze Vitals
                  </button>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <form 
              className="p-3 border-t border-brand-blue/20 bg-slate-950/80 flex gap-2 relative z-10"
              onSubmit={handleSend}
            >
              <input 
                type="text" 
                placeholder="Ask AXON for clinical insights..." 
                className="flex-1 bg-slate-900 shadow-inner border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-hidden focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50 transition-all placeholder:text-slate-600"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                disabled={isTyping}
              />
              <button 
                type="submit"
                className="w-12 h-[46px] bg-brand-blue rounded-xl flex items-center justify-center text-white hover:bg-blue-500 transition-colors shadow-[0_0_15px_rgba(56,189,248,0.4)] disabled:opacity-50 disabled:shadow-none shrink-0 border border-blue-400"
                disabled={!userQuery.trim() || isTyping}
              >
                {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 shrink-0 -ml-0.5" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

