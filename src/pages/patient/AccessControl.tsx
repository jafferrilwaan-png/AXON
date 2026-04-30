import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Shield, 
  Key, 
  Copy, 
  CheckCircle2, 
  ToggleRight, 
  ToggleLeft,
  AlertOctagon,
  Eye,
  History,
  FileText,
  Brain,
  Unlock,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { GlassCard, Button, Badge } from '../../components/ui';

export default function AccessControl() {
  const { patient, refreshProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [consents, setConsents] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [permissions, setPermissions] = useState({
    reports: true,
    aiSummary: true,
    timeline: true
  });

  useEffect(() => {
    if (patient?.id) {
      fetchConsents();
      fetchAuditLogs();
    }
  }, [patient?.id]);

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('patient_id', patient?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      setAuditLogs(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConsents = async () => {
    try {
      const { data, error } = await supabase
        .from('consents')
        .select('*')
        .eq('patient_id', patient?.id);
      
      if (error) throw error;
      setConsents(data || []);
    } catch (err) {
      console.error("Error fetching consents", err);
    }
  };

  const updateConsentStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('consents')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      toast.success(`Access request ${newStatus}`);
      fetchConsents();
    } catch (err) {
      toast.error(`Failed to update access request`);
    }
  };
  const [emergencyMode, setEmergencyMode] = useState(false);

  const handleCopy = () => {
    if (patient?.clinical_id) {
      navigator.clipboard.writeText(patient.clinical_id);
      setCopied(true);
      toast.success("Clinical ID copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleAccess = async () => {
    if (!patient?.user_id) return;
    setLoading(true);
    try {
      const newState = !patient.doctor_access_enabled;
      const { error } = await supabase
        .from('patients')
        .update({ doctor_access_enabled: newState })
        .eq('user_id', patient.user_id);
      
      if (error) throw error;
      
      toast.success(
        newState 
          ? "Doctor access enabled. Providers can now view your records." 
          : "Doctor access disabled. Your records are now locked."
      );
      await refreshProfile();
    } catch (err: any) {
      toast.error("Failed to update access settings");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success(`${key} access permission updated`);
  };

  return (
    <div className="container mx-auto px-6 py-10 space-y-12">
      <header className="border-b border-white/5 pb-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold font-display text-white tracking-tight">Security & Access Center</h1>
            <p className="text-slate-400 mt-2 font-light">Manage who can decrypt and view your clinical memory layer.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 mt-6">
          <Badge variant="success" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 py-1.5 px-3 uppercase tracking-widest text-[10px]">Data Encrypted</Badge>
          <Badge variant="info" className="py-1.5 px-3 border-brand-blue/30 text-brand-blue uppercase tracking-widest text-[10px]">Role-Based Access</Badge>
          <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 py-1.5 px-3 uppercase tracking-widest text-[10px]">OTP Secured</Badge>
          <Badge variant="outline" className="border-purple-500/30 text-purple-400 py-1.5 px-3 uppercase tracking-widest text-[10px]">Patient Controlled</Badge>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Connection Setup & Master Toggle */}
        <div className="space-y-8">
          <GlassCard className="flex flex-col border-brand-cyan/20 bg-brand-cyan/5">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-brand-cyan/20 rounded-xl">
                <Key className="w-6 h-6 text-brand-cyan" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white tracking-wide">Permanent Doctor's Key</h3>
                <p className="text-sm text-slate-400 mt-1">Your secure clinical identifier. Providers need this to request access to your records.</p>
              </div>
            </div>
            
            <div className="bg-slate-950 p-6 rounded-xl border border-white/5 flex items-center justify-between shadow-inner">
              <div className="font-mono text-4xl font-bold tracking-[0.2em] text-cyan-400 select-all">
                {patient?.clinical_id || '------'}
              </div>
              <button 
                onClick={handleCopy}
                className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                title="Copy ID"
              >
                {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </GlassCard>

          <GlassCard className="flex flex-col">
            <div className="flex items-start gap-4 mb-6">
              <div className={`p-3 rounded-xl transition-colors ${patient?.doctor_access_enabled ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <Unlock className={`w-6 h-6 ${patient?.doctor_access_enabled ? 'text-emerald-400' : 'text-red-400'}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white tracking-wide">Global Master Lock</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {patient?.doctor_access_enabled 
                    ? "Your records are currently unlocked for authorized providers." 
                    : "Your vault is completely locked down."}
                </p>
              </div>
              <button onClick={toggleAccess} disabled={loading} className="shrink-0 flex items-center outline-hidden">
                {patient?.doctor_access_enabled 
                  ? <ToggleRight className="w-12 h-12 text-emerald-500 transition-all hover:text-emerald-400" /> 
                  : <ToggleLeft className="w-12 h-12 text-slate-600 transition-all hover:text-red-400" />}
              </button>
            </div>
            <div className="p-4 bg-white/5 rounded-xl text-xs text-slate-400 border border-white/5 shadow-inner">
              When the master lock is enabled, even approved providers cannot read your medical records. Ideal for maximum privacy between consultations.
            </div>
          </GlassCard>

          <GlassCard className="border-red-500/20 bg-linear-to-br from-red-500/5 to-transparent">
             <div className="flex items-center gap-4 mb-4">
               <div className="p-2 bg-red-500/10 rounded-lg">
                 <AlertOctagon className="w-5 h-5 text-red-500" />
               </div>
               <div>
                  <h4 className="font-bold text-white tracking-tight">Emergency Protocol</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Allow ER doctors to bypass verification</p>
               </div>
               <div className="ml-auto">
                 <button onClick={() => { setEmergencyMode(!emergencyMode); toast(emergencyMode ? 'Emergency mode deactivated' : 'Emergency mode activated', { icon: emergencyMode ? '🛡️' : '🚨' }); }} className="outline-hidden">
                   {emergencyMode 
                     ? <ToggleRight className="w-10 h-10 text-red-500 transition-all" /> 
                     : <ToggleLeft className="w-10 h-10 text-slate-600 transition-all" />}
                 </button>
               </div>
             </div>
          </GlassCard>
        </div>

        {/* Granular Permissions & Provider Lists */}
        <div className="space-y-8">
          
          <GlassCard>
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-5 h-5 text-brand-blue" />
              <h3 className="text-lg font-bold">Approved Providers</h3>
            </div>
            
            <div className="space-y-3">
              {consents.filter(c => c.status === 'active').map(c => (
                <div key={c.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-brand-blue/30 flex items-center justify-center font-bold text-brand-blue text-sm uppercase">
                      {c.doctor_email.substring(0, 2)}
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-white">{c.doctor_email}</h5>
                      <p className="text-[10px] uppercase tracking-widest text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Access Approved
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => updateConsentStatus(c.id, 'revoked')} variant="outline" size="sm" className="text-xs h-8 border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">Revoke</Button>
                </div>
              ))}
              
              {consents.filter(c => c.status === 'active').length === 0 && (
                <div className="p-4 text-center text-slate-500 text-sm italic">No approved providers</div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-slate-300">Pending Requests</h4>
                <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/5 px-2 py-0.5 text-[10px]">{consents.filter(c => c.status === 'pending').length} New</Badge>
              </div>
              
              {consents.filter(c => c.status === 'pending').map(c => (
                <div key={c.id} className="flex items-center justify-between p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl mb-3">
                   <div>
                      <h5 className="font-bold text-sm text-white">{c.doctor_email}</h5>
                      <p className="text-xs text-slate-400 mt-1 hidden sm:block">Requesting data access</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => updateConsentStatus(c.id, 'revoked')} variant="outline" size="sm" className="text-xs h-8 border-white/10 hover:bg-white/5 text-slate-300 transition-colors">Deny</Button>
                      <Button onClick={() => updateConsentStatus(c.id, 'active')} size="sm" className="text-xs h-8 bg-amber-500/20 text-amber-500 border border-amber-500/50 hover:bg-amber-500/30 transition-colors">Approve</Button>
                    </div>
                </div>
              ))}
              {consents.filter(c => c.status === 'pending').length === 0 && (
                <div className="text-center text-slate-500 text-sm italic">No pending requests</div>
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-lg font-bold mb-6">Granular Data Permissions</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-brand-blue/30 transition-colors group">
                <div className="flex items-center gap-4">
                  <FileText className={`w-5 h-5 ${permissions.reports ? 'text-brand-blue' : 'text-slate-600'} transition-colors`} />
                  <div>
                    <span className="text-sm font-bold block text-white">Full Medical Reports</span>
                    <span className="text-xs text-slate-400">PDFs, Scans, and raw data files</span>
                  </div>
                </div>
                <button onClick={() => togglePermission('reports')} className="outline-hidden">
                  {permissions.reports ? <ToggleRight className="w-8 h-8 text-brand-blue transition-all" /> : <ToggleLeft className="w-8 h-8 text-slate-600 transition-all" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-brand-purple/30 transition-colors group">
                <div className="flex items-center gap-4">
                  <Brain className={`w-5 h-5 ${permissions.aiSummary ? 'text-brand-purple' : 'text-slate-600'} transition-colors`} />
                  <div>
                    <span className="text-sm font-bold block text-white">AI Neural Summary</span>
                    <span className="text-xs text-slate-400">Aggregated insights and vitality score</span>
                  </div>
                </div>
                <button onClick={() => togglePermission('aiSummary')} className="outline-hidden">
                  {permissions.aiSummary ? <ToggleRight className="w-8 h-8 text-brand-purple transition-all" /> : <ToggleLeft className="w-8 h-8 text-slate-600 transition-all" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-brand-cyan/30 transition-colors group">
                <div className="flex items-center gap-4">
                  <History className={`w-5 h-5 ${permissions.timeline ? 'text-brand-cyan' : 'text-slate-600'} transition-colors`} />
                  <div>
                    <span className="text-sm font-bold block text-white">Health Timeline</span>
                    <span className="text-xs text-slate-400">Chronological event history</span>
                  </div>
                </div>
                <button onClick={() => togglePermission('timeline')} className="outline-hidden">
                  {permissions.timeline ? <ToggleRight className="w-8 h-8 text-brand-cyan transition-all" /> : <ToggleLeft className="w-8 h-8 text-slate-600 transition-all" />}
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Live Access Monitor */}
          <GlassCard className="border-emerald-500/20 bg-slate-950 shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-500" />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Live Access Monitor</h4>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Monitoring
              </span>
            </div>
            <div className="py-4 border-t border-white/5 space-y-3">
              {auditLogs.length > 0 ? auditLogs.map(log => (
                <div key={log.id} className="flex flex-col gap-2 text-xs font-mono bg-white/5 p-3 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 uppercase">{log.action_type}</span>
                    <span className="text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-slate-300 font-semibold text-right">
                    {log.details?.doctor_name || log.details?.doctor_email || 'Unknown Provider'} 
                    <span className="text-slate-500 text-[10px] ml-2">({log.details?.specialization || 'General'})</span>
                  </div>
                </div>
              )) : (
                <div className="text-center text-slate-500 text-xs italic py-4">No access logs found.</div>
              )}
            </div>
          </GlassCard>

        </div>
      </div>
    </div>
  );
}
