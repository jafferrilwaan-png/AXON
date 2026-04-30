import React, { useState, useEffect } from 'react';
import { ShieldAlert, Key, Database, Cpu, ExternalLink, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function ConfigurationOverlay() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Failed to connect to backend');
      const data = await res.json();
      setConfig(data.config);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConfig();
    const interval = setInterval(checkConfig, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const isConfigured = config && config.gemini && config.supabaseUrl && config.supabaseAnonKey && config.axonEncryptionKey;

  if (loading && !config) return null;
  if (isConfigured) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md"
      >
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Animated background glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 blur-3xl rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 blur-3xl rounded-full" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
              <ShieldAlert className="w-8 h-8 text-blue-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">AXON: Configuration Required</h2>
            <p className="text-slate-400 mb-8 max-w-sm">
              To activate the AXON Intelligence Layer and backend services, you must configure your API keys in the environment.
            </p>

            <div className="grid grid-cols-1 gap-3 w-full mb-8">
              <ConfigItem 
                icon={Database} 
                label="Supabase URL & Anon Key" 
                status={config?.supabaseUrl && config?.supabaseAnonKey} 
                vars={['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']}
              />
              <ConfigItem 
                icon={Cpu} 
                label="Gemini AI (Google GenAI)" 
                status={config?.gemini} 
                vars={['GOOGLE_API_KEY']}
              />
              <ConfigItem 
                icon={Key} 
                label="Axon Encryption Key" 
                status={config?.axonEncryptionKey} 
                vars={['VITE_AXON_ENCRYPTION_KEY']}
              />
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 w-full mb-8 text-left border border-slate-700">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-slate-300">
                <ExternalLink className="w-4 h-4" />
                <span>How to configure:</span>
              </div>
              <ol className="text-xs text-slate-400 list-decimal list-inside space-y-2">
                <li>Go to the <span className="text-blue-400 font-mono">Settings</span> (gear icon) in the bottom-left.</li>
                <li>Select <span className="text-blue-400 font-mono">Secrets</span> and add the variables listed above.</li>
                <li>
                  <a href="/setup" className="text-blue-400 hover:underline font-bold flex items-center gap-1 mt-1">
                    Follow the Database Setup Guide <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ol>
            </div>

            <button 
              onClick={checkConfig}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors w-full justify-center"
            >
              <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Check Status
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ConfigItem({ icon: Icon, label, status, vars }: { icon: any, label: string, status: boolean, vars: string[] }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
      status ? 'bg-green-500/5 border-green-500/20' : 'bg-slate-800/50 border-slate-700/50'
    }`}>
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${status ? 'text-green-400' : 'text-slate-500'}`} />
        <div className="text-left">
          <div className={`text-sm font-medium ${status ? 'text-green-400' : 'text-slate-300'}`}>{label}</div>
          <div className="text-[10px] text-slate-500 font-mono italic">{vars.join(', ')}</div>
        </div>
      </div>
      <div className={`w-2 h-2 rounded-full ${status ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-600'}`} />
    </div>
  );
}
