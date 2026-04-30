import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ArrowRight, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button, GlassCard, Input } from '../components/ui';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, patient, loading: authLoading, signUp } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>(
    (new URLSearchParams(location.search).get('role') as 'patient' | 'doctor') || 'patient'
  );

  // Sync role with query param if it changes
  useEffect(() => {
    const searchRole = new URLSearchParams(location.search).get('role');
    if (searchRole === 'patient' || searchRole === 'doctor') {
      setRole(searchRole);
    }
  }, [location.search]);

  // Handle successful login redirect
  useEffect(() => {
    if (user && !authLoading) {
      // The user wants to manually influence the portal destination based on the selected tab
      // even if their account metadata says otherwise (common for test accounts)
      if (role === 'doctor') {
        navigate('/portal/doctor/access', { replace: true });
      } else {
        const origin = (location.state as any)?.from?.pathname || '/portal/patient/dashboard';
        navigate(origin, { replace: true });
      }
    }
  }, [user, authLoading, navigate, role, location.state]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Successfully logged in");
      } else {
        await signUp(email, password, name, role);
        toast.success("Account created successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <motion.img 
          src="https://i.ibb.co/Cpsv0qY7/73024ef0-7fe4-4884-96b1-58af0a49ff7c.png" 
          alt="AXON Logo" 
          className="h-16 opacity-50"
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.95, 1, 0.95] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6 relative overflow-hidden bg-slate-950">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-blue/5 blur-[100px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-brand-purple/5 blur-[100px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center justify-center mb-6"
          >
            <motion.img 
              src="https://i.ibb.co/Cpsv0qY7/73024ef0-7fe4-4884-96b1-58af0a49ff7c.png" 
              alt="AXON Logo" 
              className="w-[90px] md:w-[140px] lg:w-[160px] object-contain mx-auto"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>
          <p className="text-slate-400 mt-4 font-light">
            {isLogin ? 'Securely access your clinical memory layer.' : 'Initialize your intelligence-driven clinical profile.'}
          </p>
        </div>

        <div className="flex gap-4 mb-3">
          <button 
            onClick={() => setRole('patient')}
            className={clsx(
              "flex-1 py-3 rounded-xl border transition-all text-xs font-black uppercase tracking-tighter",
              role === 'patient' 
                ? "bg-brand-blue/20 border-brand-blue/50 text-brand-blue shadow-[0_0_20px_rgba(52,144,220,0.2)]" 
                : "bg-white/5 border-white/5 text-slate-500 hover:text-slate-300"
            )}
          >
            [ I AM A PATIENT ]
          </button>
          <button 
            onClick={() => setRole('doctor')}
            className={clsx(
              "flex-1 py-3 rounded-xl border transition-all text-xs font-black uppercase tracking-tighter",
              role === 'doctor' 
                ? "bg-brand-purple/20 border-brand-purple/50 text-brand-purple shadow-[0_0_20px_rgba(168,85,247,0.2)]" 
                : "bg-white/5 border-white/5 text-slate-500 hover:text-slate-300"
            )}
          >
            [ I AM A DOCTOR ]
          </button>
        </div>
        
        <p className="text-[10px] text-slate-500 uppercase tracking-widest text-center mb-8 font-bold">
          {role === 'patient' ? "Secure your neural clinical history & get your Doctor's Key" : "Access patient clinical memories with authorized encryption keys"}
        </p>

        <GlassCard className="p-8 border-white/10">
          <form className="space-y-6" onSubmit={handleAuth}>
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Input 
                    label="Full Name" 
                    placeholder="John Doe" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    required 
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Input 
              label="Email Address" 
              type="email" 
              placeholder="john@example.com" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required 
            />
            
            <Input 
              label="Password" 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required 
            />

            <Button type="submit" className="w-full h-14 text-lg" loading={loading || authLoading}>
              {isLogin ? 'Sign In' : 'Create Account'}
              {!(loading || authLoading) && <ArrowRight className="ml-2 w-5 h-5" />}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center flex flex-col gap-4">
            {role === 'patient' && (
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
              </button>
            )}
            {role === 'doctor' && (
              <p className="text-xs text-slate-500 uppercase tracking-widest leading-relaxed">
                Doctor registration is handled by the <span className="text-brand-purple font-bold">AXON Clinical Registrar</span>.<br />Use your hospital credentials to sign in.
              </p>
            )}
          </div>
        </GlassCard>

        <div className="mt-8 flex items-center justify-center gap-3 text-xs text-slate-500 font-medium tracking-widest uppercase">
          <Shield className="w-4 h-4 text-brand-blue" />
          Neural Secure Access
          <span className="w-1 h-1 bg-slate-700 rounded-full" />
          HIPAA Encryption
        </div>
      </motion.div>
    </div>
  );
}
