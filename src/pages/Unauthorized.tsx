import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
      <div className="absolute inset-0 max-w-7xl mx-auto">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center max-w-md w-full glass-morphism p-10 rounded-3xl border border-red-500/20"
      >
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        
        <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-4">
          Access Denied
        </h1>
        <p className="text-slate-400 mb-8 font-light">
          You do not have the required role to access this area. Access is restricted to authorized personnel.
        </p>
        
        <Link 
          to="/"
          className="inline-flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all font-bold tracking-widest text-sm uppercase group border border-white/10"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Return Home
        </Link>
      </motion.div>
    </div>
  );
}
