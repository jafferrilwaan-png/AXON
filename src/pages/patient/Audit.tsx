import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { History, Shield, Clock, User, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { AuditLog } from '../../types';
import { GlassCard, Badge } from '../../components/ui';
import { format } from 'date-fns';

export default function AuditTrail() {
  const { patient } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patient) loadLogs();
  }, [patient]);

  const loadLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('patient_id', patient!.id)
      .order('timestamp', { ascending: false });
    
    if (!error) setLogs(data);
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-12">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-6 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <h1 className="text-4xl font-bold font-display tracking-tight text-white">AXON Neural Audit Trail</h1>
        <p className="text-slate-400 mt-4 tracking-wide">Immutable log of all clinical access and memory layer interactions.</p>
      </div>

      <div className="max-w-4xl space-y-4">
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
          ))
        ) : logs.length > 0 ? (
          logs.map((log) => (
            <GlassCard key={log.id} className="p-6 hover:border-white/20 group">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-brand-blue/10 transition-all border border-white/5">
                    <Shield className="w-6 h-6 text-slate-500 group-hover:text-brand-blue" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 tracking-tight">{log.action_type.replace(/_/g, ' ')}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5 font-mono">
                        <User className="w-3.5 h-3.5" /> {(log.details && log.details.email) ? log.details.email : (log.performed_by || 'Unknown')}
                      </span>
                      <span className="w-1 h-1 bg-slate-700 rounded-full" />
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="opacity-50 font-mono text-[10px]">VERIFIED_LOG_V2</Badge>
              </div>
            </GlassCard>
          ))
        ) : (
          <div className="text-center py-20 glass-card">
            <History className="w-12 h-12 text-slate-700 mx-auto mb-6" />
            <h3 className="text-xl font-bold">No interactions detected.</h3>
            <p className="text-slate-500 mt-2">Your neural audit trail is currently empty.</p>
          </div>
        )}
      </div>
    </div>
  );
}
