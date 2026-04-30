import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  UploadCloud,
  FileText, 
  Activity,
  ArrowUpRight,
  MoreVertical,
  Beaker,
  Pill,
  Stethoscope,
  X,
  Send,
  Loader2,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { MedicalRecord } from '../../types';
import { GlassCard, Button, Badge } from '../../components/ui';
import { useDropzone } from 'react-dropzone';
import { extractMedicalData, chatWithAxon } from '../../lib/gemini';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Vault() {
  const { user, patient, refreshProfile } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('All Records');
  
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  useEffect(() => {
    if (patient) loadRecords();
  }, [patient]);

  const loadRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', patient!.id)
      .order('created_at', { ascending: false });
    
    if (!error) {
      setRecords(data);
    }
    setLoading(false);
  };

  const onDrop = async (acceptedFiles: File[]) => {
    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        // 1. Supabase Storage Upload
        const fileExt = file.name.split('.').pop();
        const fileName = `${patient?.id}/${Date.now()}-${file.name}`;
        const mimeType = file.type || 'application/octet-stream';
        
        const { error: storageError } = await supabase.storage
          .from('medical-reports')
          .upload(fileName, file);

        if (storageError) throw storageError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('medical-reports')
          .getPublicUrl(fileName);

        // 2. AI Ingestion Pipeline
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        
        const structured = await extractMedicalData(base64Data, mimeType);
        
        const { data, error } = await supabase
          .from('medical_records')
          .insert([{
            patient_id: patient!.id,
            document_type: structured.type || 'General',
            title: structured.title || file.name,
            date_detected: structured.date || new Date().toISOString().split('T')[0],
            summary: structured.snippet,
            key_findings: structured.keyFindings || [],
            follow_up: structured.followUp || [],
            file_url: publicUrl,
            is_processing: false
          }])
          .select()
          .single();
        
        if (error) throw error;
        
        await supabase.from('audit_logs').insert([{
           patient_id: patient!.id,
           action_type: 'DOC_UPLOAD_AND_INGESTION',
           performed_by: user?.id,
           ip_address: '127.0.0.1',
           details: { file: file.name, document_id: data.id }
        }]);
        
        // Refresh records to show new timeline entry
        setRecords(prev => [data, ...prev]);
        toast.success(`Successfully Analyzed: ${structured.title || file.name}`);
      }
      
      // Update vitality score based on new timeline entries
      const { vitalityAgent } = await import('../../lib/gemini');
      const updatedProfile = await vitalityAgent(patient);
      
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          health_vitality_score: updatedProfile.vitality_score,
          health_score_explanation: updatedProfile.explanation,
          improvement_areas: updatedProfile.improvement_areas
        })
        .eq('id', patient.id);
        
      if (!updateError) {
         await refreshProfile(); 
      }
      
    } catch (err: any) {
      console.error("Upload failed:", err);
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop, maxSize: 10485760 });

  const filters = ['All Records', 'Diagnoses', 'Labs', 'Medications', 'Treatments'];

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b border-white/5 pb-8">
        <div>
           <h1 className="text-4xl font-bold font-display tracking-tight text-white flex items-center gap-3">
             <Activity className="w-8 h-8 text-brand-blue" />
             <span className="underline decoration-brand-blue/30 decoration-4 underline-offset-8">AXON Clinical Vault</span>
           </h1>
           <p className="text-slate-400 mt-4 tracking-wide font-light">Your immutable, chronological health memory layer.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <Button className="gap-2 h-14 px-8 shadow-lg shadow-brand-blue/20" {...getRootProps()}>
            <UploadCloud className="w-5 h-5" /> Upload File
            <input {...getInputProps()} />
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-10 overflow-x-auto pb-4 scrollbar-hide">
         {filters.map(f => (
           <button 
             key={f}
             onClick={() => setFilter(f)}
             className={`shrink-0 px-6 py-2.5 rounded-full text-sm font-semibold transition-all border ${filter === f ? 'bg-brand-blue text-white border-brand-blue/50 shadow-[0_0_15px_rgba(56,189,248,0.3)]' : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white hover:bg-white/5'}`}
           >
             {f}
           </button>
         ))}
      </div>

      <div className="relative max-w-4xl">
         {/* Timeline vertical line */}
         <div className="absolute left-6 md:left-24 top-0 bottom-0 w-px bg-gradient-to-b from-brand-blue/50 via-white/10 to-transparent" />
         
         <AnimatePresence>
            {uploading && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="relative flex gap-6 md:gap-12 mb-8"
              >
                <div className="hidden md:flex w-16 shrink-0 flex-col items-end pt-2">
                  <div className="h-4 w-12 bg-white/5 rounded animate-pulse" />
                </div>
                <div className="absolute left-6 md:left-24 -ml-2 top-3 w-4 h-4 rounded-full bg-slate-900 border-2 border-brand-blue/50 flex items-center justify-center">
                  <Loader2 className="w-3 h-3 text-brand-blue animate-spin" />
                </div>
                <GlassCard className="flex-1 p-6 relative ml-12 md:ml-0 bg-brand-blue/5 border-brand-blue/20">
                   <div className="flex items-center gap-3">
                     <span className="text-sm font-medium text-brand-blue">AXON parsing document...</span>
                   </div>
                </GlassCard>
              </motion.div>
            )}
         </AnimatePresence>
         
         <div className="space-y-8">
           {records
             .filter(r => {
               if (filter === 'All Records') return true;
               if (filter === 'Diagnoses') return r.document_type === 'Diagnosis';
               if (filter === 'Labs') return r.document_type === 'Lab Report';
               if (filter === 'Medications') return r.document_type === 'Medication';
               if (filter === 'Treatments') return r.document_type === 'Treatment';
               return true;
             })
             .map((record, index) => (
             <TimelineNode key={record.id} record={record} onClick={() => setSelectedRecord(record)} />
           ))}
           
           {!loading && records.length === 0 && (
             <div className="ml-12 md:ml-36 p-10 glass-card text-center relative z-10">
               <FileText className="w-10 h-10 text-slate-600 mx-auto mb-4" />
               <h3 className="text-lg font-bold text-slate-300">No records found.</h3>
               <p className="text-sm text-slate-500 mt-2">Upload a lab report or prescription to start your timeline.</p>
             </div>
           )}
         </div>
      </div>

      <AnimatePresence>
        {selectedRecord && (
          <DeepDiveModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Map types to visually distinct colors
const getTypeColor = (type: string) => {
  switch (type) {
    case 'Diagnosis': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
    case 'Lab Report': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    case 'Medication': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    case 'Treatment': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    default: return 'text-slate-300 bg-white/5 border-white/10';
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'Diagnosis': return <Stethoscope className="w-3.5 h-3.5" />;
    case 'Lab Report': return <Beaker className="w-3.5 h-3.5" />;
    case 'Medication': return <Pill className="w-3.5 h-3.5" />;
    case 'Treatment': return <Activity className="w-3.5 h-3.5" />;
    default: return <FileText className="w-3.5 h-3.5" />;
  }
}

const TimelineNode = ({ record, onClick }: { record: MedicalRecord, onClick: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex gap-6 md:gap-12 group cursor-pointer"
      onClick={onClick}
    >
      {/* Date on the left (Desktop) */}
      <div className="hidden md:flex w-16 shrink-0 flex-col items-end pt-3">
        <span className="text-xs font-bold text-slate-400 group-hover:text-brand-blue transition-colors">
          {format(new Date(record.created_at), 'MMM d')}
        </span>
        <span className="text-[10px] text-slate-600">
          {format(new Date(record.created_at), 'yyyy')}
        </span>
      </div>

      {/* Node Dot */}
      <div className="absolute left-6 md:left-24 -ml-[5px] top-4 w-[10px] h-[10px] rounded-full bg-brand-blue border-[2px] border-slate-950 shadow-[0_0_10px_rgba(56,189,248,0.5)] z-10 group-hover:scale-150 transition-transform duration-300" />

      {/* Card */}
      <GlassCard className="flex-1 p-5 md:p-6 relative ml-12 md:ml-0 group-hover:-translate-y-1 transition-all duration-300 group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] group-hover:border-brand-blue/30">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge className={`px-2 py-0.5 rounded-md flex items-center gap-1.5 ${getTypeColor(record.document_type || 'General')}`}>
                 {getTypeIcon(record.document_type || 'General')}
                 {record.document_type || 'General'}
              </Badge>
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">{record.document_type}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-200 group-hover:text-white transition-colors">{record.title}</h3>
            
            {/* The AI Snippet */}
            {record.summary && (
              <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/5 flex gap-3 text-sm">
                 <Activity className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                 <p className="text-slate-300 italic">{record.summary}</p>
              </div>
            )}
             {/* Mobile date */}
             <div className="md:hidden mt-4 text-[10px] font-bold tracking-widest uppercase text-slate-500">
               {format(new Date(record.created_at), 'MMM d, yyyy')}
             </div>
          </div>
          
          <div className="shrink-0 flex items-center text-xs font-bold text-brand-blue uppercase tracking-widest gap-1 opactiy-0 group-hover:opacity-100 transition-opacity mt-4 sm:mt-0">
             Deep Dive <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}

const DeepDiveModal = ({ record, onClose }: { record: MedicalRecord, onClose: () => void }) => {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping) return;
    
    const query = chatInput;
    const newHistory = [...chatHistory, { role: 'user', text: query }];
    setChatHistory(newHistory);
    setChatInput('');
    setIsTyping(true);

    try {
      const messages = [
        { role: 'model', text: `Here is the record context: Title: ${record.title}, Type: ${record.document_type}. AI Summary: ${record.summary}` },
        ...newHistory
      ];
      const response = await chatWithAxon(messages, query);
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'model', text: 'Error connecting to AXON.' }]);
    } finally {
       setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-brand-blue/30 rounded-3xl shadow-[0_0_50px_rgba(52,144,220,0.15)] flex flex-col md:flex-row overflow-hidden"
      >
         {/* Left Side: Document Preview & Info */}
         <div className="w-full md:w-[40%] bg-slate-950 border-r border-white/5 flex flex-col items-center justify-center relative p-8">
            <h2 className="text-xl font-bold mb-2 text-center">{record.title}</h2>
            <div className="flex gap-2 mb-8">
              <Badge variant="outline" className="border-brand-blue/30 text-brand-blue bg-brand-blue/5">
                {record.document_type}
              </Badge>
              <Badge variant="outline" className="border-white/10 text-slate-400">
                <Calendar className="w-3 h-3 mr-1" /> {format(new Date(record.created_at), 'MMM d, yyyy')}
              </Badge>
            </div>
            
            {record.file_url ? (
              <a 
                href={record.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full max-w-xs group relative overflow-hidden rounded-2xl border-2 border-dashed border-white/10 bg-white/5 hover:border-brand-blue/50 hover:bg-brand-blue/5 transition-all text-center p-12 cursor-pointer flex flex-col items-center"
              >
                <FileText className="w-16 h-16 text-slate-600 group-hover:text-brand-blue mb-4 transition-colors" />
                <span className="font-bold text-slate-300 group-hover:text-white transition-colors">View Original Document</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-2 block">Opens in new tab</span>
              </a>
            ) : (
              <div className="p-12 text-center opacity-50">
                 <FileText className="w-16 h-16 mx-auto mb-4" />
                 <p>No document attached</p>
              </div>
            )}
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 md:hidden p-2 bg-white/10 rounded-full text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
         </div>
         
         {/* Right Side: AXON Analysis */}
         <div className="w-full md:w-[60%] flex flex-col h-[60vh] md:h-auto">
            <div className="flex justify-between items-center p-6 border-b border-brand-blue/20 bg-brand-blue/5">
               <div className="flex items-center gap-3">
                 <Activity className="w-5 h-5 text-brand-blue" />
                 <h3 className="font-bold text-lg text-brand-blue tracking-tight">AXON Intelligence Report</h3>
               </div>
               <button onClick={onClose} className="hidden md:flex p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               {/* Key Findings */}
               <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 ml-1">Key Findings</h4>
                  <ul className="space-y-2">
                     {record.key_findings && record.key_findings.length > 0 ? record.key_findings.map((finding: string, i: number) => (
                       <li key={i} className="flex gap-3 text-sm text-slate-300 items-start bg-white/5 p-3 rounded-xl border border-white/5">
                         <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-2 shrink-0" />
                         <span className="leading-relaxed">{finding}</span>
                       </li>
                     )) : (
                       <li className="text-sm text-slate-500">No specific findings parsed.</li>
                     )}
                  </ul>
               </div>

               {/* Follow Up */}
               <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 ml-1 mt-6">Follow-Up Suggestions</h4>
                  <ul className="space-y-2">
                     {record.follow_up && record.follow_up.length > 0 ? record.follow_up.map((tip: string, i: number) => (
                       <li key={i} className="flex gap-3 text-sm text-slate-300 items-start bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                         <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                         <span className="leading-relaxed text-amber-200/80">{tip}</span>
                       </li>
                     )) : (
                       <li className="text-sm text-slate-500">No specific follow-up actions flagged.</li>
                     )}
                  </ul>
               </div>
               
               {/* Contextual Ask AXON */}
               <div className="mt-8 pt-8 border-t border-white/10">
                 <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                   <Activity className="w-4 h-4" /> Ask AXON about this record
                 </h4>
                 
                 <div className="space-y-3 mb-4">
                   {chatHistory.map((m, idx) => (
                     <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`text-sm p-3 rounded-2xl max-w-[85%] ${m.role === 'user' ? 'bg-brand-blue text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'}`}>
                          {m.text}
                        </div>
                     </div>
                   ))}
                 </div>
                 
                 <form onSubmit={handleChat} className="flex gap-2">
                   <input 
                      type="text" 
                      placeholder="e.g., What does this specific value mean?" 
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-hidden focus:border-brand-blue/50"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={isTyping}
                   />
                   <button 
                     type="submit" 
                     disabled={!chatInput.trim() || isTyping}
                     className="w-12 flex items-center justify-center bg-brand-blue text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-colors"
                   >
                     {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 -ml-0.5" />}
                   </button>
                 </form>
               </div>
            </div>
         </div>
      </motion.div>
    </div>
  );
}

