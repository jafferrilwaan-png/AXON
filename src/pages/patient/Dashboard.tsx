import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { 
  Activity, 
  Brain, 
  History,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  TrendingUp,
  Lock,
  Clock,
  FileText,
  ChevronRight,
  Sparkles,
  UploadCloud,
  Settings,
  HeartPulse,
  KeyRound,
  Key
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { MedicalRecord } from '../../types';
import { GlassCard, Button, Badge } from '../../components/ui';
import { summaryAgent, riskAgent } from '../../lib/gemini';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// Removed SurveyModal because it's handled in Profile.tsx

import { processMedicalDocument } from '../../lib/documentIntelligence';

export default function Dashboard() {
  const { user, patient, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [riskInsight, setRiskInsight] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (patient) {
      loadData();
      
      // Real-time polling for background AI updates - reduced frequency to preserve quota
      const interval = setInterval(() => {
        loadData(false); // Silent refresh
      }, 30000); // 30 seconds instead of 5
      
      return () => clearInterval(interval);
    }
  }, [patient]);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !patient) return;

    setUploading(true);
    toast.loading("Uploading artifacts to AXON Vault...", { id: 'upload' });

    try {
      await processMedicalDocument(file, patient.id);
      toast.success("Document accepted. AI Processing started in background.", { id: 'upload' });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Upload failed", { id: 'upload' });
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxSize: 10485760,
  });

  const loadData = async (showLoading = true) => {
    if (!patient) return;
    if (showLoading) setLoading(true);
    try {
      const { data: recordsData, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });
    
      if (error) throw error;
      
      setRecords(recordsData);
      if (showLoading) setLoading(false);

      // Only run summary if the latest record is processed
      if (recordsData.length > 0 && recordsData[0].is_processing === false) {
        try {
          if (showLoading) setAiLoading(true);
          const [sum, risk] = await Promise.all([
            summaryAgent(patient, recordsData),
            riskAgent(recordsData)
          ]);
          setSummary(sum);
          setRiskInsight(risk);
        } catch (aiErr) {
          console.error("AI Insights failed:", aiErr);
        } finally {
          if (showLoading) setAiLoading(false);
        }
      } else if (recordsData.length === 0) {
        if (showLoading) setAiLoading(false);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };



  return (
    <div className="container mx-auto px-6 py-10 space-y-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-white/5 pb-10">
        <div className="space-y-2">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">AXON: <span className="text-slate-500 font-light">Memory Layer</span></h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Your longitudinal clinical record, verified by neural intelligence.</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto flex-1">
          {patient?.clinical_id && (
            <div className="flex items-center gap-4 bg-white/[0.03] border border-white/10 px-6 py-4 rounded-2xl w-full md:flex-none md:w-80">
              <KeyRound className="w-6 h-6 text-brand-blue" />
              <div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Your Clinical Key</div>
                <div className="font-mono text-xl font-black tracking-[0.4em] text-white underline decoration-brand-blue/30">{patient.clinical_id}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Stats Column */}
        <div className="lg:col-span-8 space-y-12">
          {/* AXON Health Vitality Score */}
          <GlassCard className="relative overflow-hidden group border-white/10 bg-white/[0.01] p-1">
            <div className="bg-slate-950/40 p-8 rounded-[inherit] relative z-10 flex flex-col md:flex-row items-center gap-10">
              <div className="relative shrink-0">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="72"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    className="text-white/5"
                  />
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="72"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={452}
                    initial={{ strokeDashoffset: 452 }}
                    animate={{ strokeDashoffset: 452 - (452 * (patient?.health_vitality_score || 0)) / 100 }}
                    transition={{ duration: 2, ease: "circOut" }}
                    className="text-brand-blue shadow-[0_0_20px_rgba(34,211,238,0.5)]"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-white">{patient?.health_vitality_score || '--'}</span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">AXON Index</span>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left space-y-4">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xl font-black uppercase tracking-widest text-white">Vitality Projection</h2>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed font-medium">
                  Your baseline vitality score derived from clinical vitals, lifestyle markers, and neurological clinical history.
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
                  {patient?.improvement_areas?.map((area, i) => (
                    <span key={i} className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-white/5 border border-white/10 text-slate-400 rounded">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* AI Intelligence Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="border-white/5 bg-white/[0.02] p-8 hover:bg-white/[0.03] transition-all">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-brand-blue" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">AI Clinical Brief</h3>
                </div>
                {aiLoading && (
                   <motion.div 
                     className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-pulse"
                   />
                )}
              </div>
              {aiLoading ? <SkeletonLines /> : (
                <div className="space-y-6">
                  <p className="text-xs text-slate-300 leading-relaxed italic border-l border-brand-blue/30 pl-4">
                    "{summary || 'Neural clinical history awaiting ingestion and synthesis.'}"
                  </p>
                  <div className="pt-2">
                    <Button 
                      onClick={() => navigate('/portal/patient/ai-insights')} 
                      disabled={aiLoading || !summary}
                      className="w-full h-8 text-[10px] font-black tracking-widest uppercase bg-white/5 text-slate-400 hover:bg-brand-blue/10 hover:text-brand-blue border-white/5"
                    >
                      Ingest Deep Metrics
                    </Button>
                  </div>
                </div>
              )}
            </GlassCard>

            <GlassCard className={clsx("p-8 transition-all", riskInsight?.risk_level === 'high' ? 'border-red-500/20 bg-red-500/5' : 'border-white/5 bg-white/[0.02]')}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <TrendingUp className={riskInsight?.risk_level === 'high' ? 'text-red-400' : 'text-slate-400'} size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Health Trajectory</h3>
                </div>
                {riskInsight && (
                  <span className={clsx(
                    "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                    riskInsight.risk_level === 'high' ? 'bg-red-500 text-white' : 'bg-emerald-500/20 text-emerald-400'
                  )}>
                    {riskInsight.risk_level} Risk
                  </span>
                )}
              </div>
              {loading ? <SkeletonLines /> : (
                <div className="space-y-6">
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium uppercase tracking-tight">
                    {riskInsight?.reasoning || 'Insufficient data vectors to project chronic health trajectory.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {riskInsight?.conditions?.map((c: any, i: any) => (
                      <span key={i} className="text-[10px] font-black px-2 py-1 bg-white/5 rounded border border-white/10 text-slate-400 uppercase tracking-tighter">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Medical Intelligence Timeline */}
          <div className="space-y-10">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                <History className="w-5 h-5 text-slate-500" />
                Siloed Intelligence <span className="text-slate-600 font-light">History</span>
              </h3>
              <div {...getRootProps()} className="cursor-pointer">
                <input {...getInputProps()} />
                <Button size="sm" variant="outline" className="h-10 px-6 gap-2 border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/5">
                   <UploadCloud className="w-4 h-4" /> Digitize Artifact
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              {records.map(record => (
                <RecordTimelineCard key={record.id} record={record} />
              ))}
              
              {records.length === 0 && !loading && (
                <div {...getRootProps()} className="p-20 text-center rounded-[2rem] border border-dashed border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors cursor-pointer group">
                  <input {...getInputProps()} />
                  <div className="relative inline-block mb-6">
                    <UploadCloud className="w-16 h-16 text-slate-800 group-hover:text-brand-blue transition-colors" />
                    <motion.div 
                      className="absolute -top-2 -right-2 w-6 h-6 bg-brand-blue rounded-full flex items-center justify-center"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles size={12} className="text-white" />
                    </motion.div>
                  </div>
                  <p className="text-slate-500 text-xs uppercase font-black tracking-widest">Longitudinal memory is offline</p>
                  <p className="text-slate-600 text-[10px] mt-2 uppercase tracking-[0.2em] font-medium">Upload Clinical Artifacts to begin AI ingestion</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info Column */}
        <div className="lg:col-span-4 space-y-10">
          <GlassCard className="p-8 border-white/5 bg-white/[0.01]">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-blue" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Baseline Telemetry</h3>
              </div>
              <Link to="/portal/patient/profile" className="text-[10px] font-black text-slate-600 hover:text-white uppercase tracking-widest transition-colors">Adjust</Link>
            </div>
            <div className="space-y-8">
               <MetaGroup label="Clinical Vitals" items={[
                { label: 'Blood Pressure', value: patient?.bp_systolic ? `${patient.bp_systolic}/${patient.bp_diastolic} mmHg` : 'Pending' },
                { label: 'Heart Rate', value: patient?.heart_rate ? `${patient.heart_rate} BPM` : 'Pending' },
                { label: 'Blood Sugar', value: patient?.blood_sugar ? `${patient.blood_sugar} mg/dL` : 'Pending' }
              ]} />
              <div className="h-px bg-white/5" />
              <MetaGroup label="Neural Metrics" items={[
                { label: 'Memory Depth', value: `${records.length} Documents` },
                { label: 'Sleep Phase', value: `${patient?.sleep_hours || 0}h` },
                { label: 'Liquid Mass', value: `${patient?.water_intake || 0}L` }
              ]} />
            </div>
          </GlassCard>

          <GlassCard className="p-8 border-white/5 bg-brand-blue/5">
             <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-full bg-brand-blue/20 flex items-center justify-center">
                 <ShieldCheck className="text-brand-blue w-6 h-6" />
               </div>
               <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-white">AXON Encrypted</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">End-to-End Clinical Privacy</p>
               </div>
             </div>
             <p className="text-[10px] text-slate-400 leading-relaxed font-medium mb-6">
               Your data is siloed and encrypted. Access is strictly granted via 6-digit clinical keys generated daily.
             </p>
             <Link 
               to="/portal/doctor/access" 
               className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all"
             >
               <Key className="w-3 h-3" /> Test Doctor Protocol
             </Link>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

const SkeletonLines = () => (
  <div className="space-y-3 animate-pulse">
    <div className="h-3 bg-white/5 rounded w-full" />
    <div className="h-3 bg-white/5 rounded w-3/4" />
  </div>
);

const MetaGroup = ({ label, items }: { label: string, items: { label: string, value?: string }[] }) => (
  <div className="space-y-4">
    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">{label}</span>
    {items.map((item, i) => (
      <div key={i} className="flex flex-col gap-0.5">
        <span className="text-[10px] text-slate-500 font-medium">{item.label}</span>
        <span className="text-sm font-semibold text-white">{item.value || 'N/A'}</span>
      </div>
    ))}
  </div>
);

const PulseItem = ({ label, status }: { label: string, status: string }) => (
  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
    {label}
    <span className="flex items-center gap-1.5 text-emerald-400/70">
      <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {status}
    </span>
  </div>
);

const RecordTimelineCard = ({ record }: { record: MedicalRecord }) => {
  const isHighRisk = (record.risk_flags || []).length > 0;
  
  return (
    <div className={clsx(
      "p-6 rounded-3xl border transition-all group relative overflow-hidden",
      record.is_processing 
        ? "bg-white/[0.01] border-white/5 opacity-50" 
        : "bg-white/[0.02] border-white/5 hover:border-brand-blue/20 hover:bg-white/[0.03]"
    )}>
      {isHighRisk && !record.is_processing && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[40px] -z-10" />
      )}
      
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h4 className="font-black text-lg text-white uppercase tracking-tighter group-hover:text-brand-blue transition-colors">
                  {record.title}
                </h4>
                {record.is_processing && (
                   <span className="flex items-center gap-2 text-[10px] font-black text-brand-blue uppercase animate-pulse">
                     <div className="w-1 h-1 bg-current rounded-full" /> AI Processing
                   </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                <span>{record.date_detected || format(new Date(record.created_at || new Date()), 'MMM d, yyyy')}</span>
                <span className="w-1 h-1 bg-slate-700 rounded-full" />
                <span className="text-white/60">{record.document_type || 'Clinical Event'}</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              {(record.risk_flags || []).map((risk: string, i: number) => (
                <span key={i} className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-red-500 text-white rounded">
                  {risk}
                </span>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed italic pr-10">
            "{record.summary || (record.is_processing ? "Harmonizing siloed EHR data into your clinical memory layer..." : "Document artifact preserved.")}"
          </p>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              {(record.key_findings || []).slice(0, 2).map((item: string, i: number) => (
                <span key={i} className="text-[9px] font-black uppercase tracking-[0.05em] text-cyan-400/70 border border-cyan-400/20 px-2 py-0.5 rounded">
                  {item}
                </span>
              ))}
            </div>
            
            <div className="flex gap-4">
               {record.file_url && (
                <a 
                  href={record.file_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-colors flex items-center gap-2"
                >
                  View Original <ArrowUpRight size={12} />
                </a>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecordSkeleton = () => (
  <div className="glass-card animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-white/5 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/5 rounded w-1/3" />
        <div className="h-3 bg-white/5 rounded w-1/4" />
      </div>
    </div>
  </div>
);
