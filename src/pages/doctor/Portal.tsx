import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useSpring } from 'motion/react';
import { 
  Lock, Mail, KeyRound, ArrowRight, Table, Activity, 
  Pill, HeartPulse, ShieldAlert, Key, Zap, Brain, Building2, LogOut
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MedicalRecord, Patient } from '../../types';
import { axonMedicalScribe } from '../../lib/gemini';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Markdown from 'react-markdown';
import { LogoutConfirmModal } from '../../components/LogoutConfirmModal';

// --- BACKGROUND LUMINOUS EFFECT COMPONENT ---
// This ensures the custom dynamic background glow requested is present on this view.
const DynamicBackgroundGlow = () => {
  const springConfig = { damping: 30, stiffness: 100 };
  const mouseX = useSpring(0, springConfig);
  const mouseY = useSpring(0, springConfig);

  useEffect(() => {
    const updateMouse = (e: MouseEvent) => {
      // Small offset to keep the glow subtly near the center/left as requested
      mouseX.set(e.clientX - (window.innerWidth / 3));
      mouseY.set(e.clientY - (window.innerHeight / 2));
    };
    window.addEventListener('mousemove', updateMouse);
    return () => window.removeEventListener('mousemove', updateMouse);
  }, [mouseX, mouseY]);

  return (
    <div className="fixed inset-0 z-0 bg-[#0A0F1C] overflow-hidden pointer-events-none">
      {/* Background ambient deep space blue */}
      <div className="absolute inset-0 bg-[#0A0F1C]" />
      
      {/* The Dynamic Luminous Glow from the mouse tracking */}
      <motion.div
        style={{ x: mouseX, y: mouseY }}
        className="absolute w-[500px] h-[500px] rounded-full blur-[150px] opacity-30 mix-blend-screen bg-cyan-500"
      />
      
      {/* Secondary accent glow */}
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full blur-[120px] opacity-15 bg-blue-700" />
    </div>
  );
};

// --- MOCK DATABASE FALLBACK (If actual DB is empty) ---
const mockSiloedDatabase = {
  diagnosis: ["Type 2 Diabetes (Epic EHR Data)", "Hypertension (Cerner EHR Data)"],
  labs: ["HbA1c: 7.2%", "Fasting Glucose: 140 mg/dL", "BP: 145/90avg"],
  medications: ["Metformin 500mg BID (Epic)", "Lisinopril 10mg Daily (Cerner)"],
  treatment: ["Dietary modification, quarterly monitoring", "Start stress management protocol"]
};

export default function DoctorPortal() {
  const { user, isDoctor, loading: authLoading, signOut } = useAuth();
  
  // Logic states matching the 2FA flow in image_2.png
  const [patientCode, setPatientCode] = useState('');
  const [mailId, setMailId] = useState('');
  const [otp, setOtp] = useState('');
  const [authStage, setAuthStage] = useState(0); // 0: Init, 1: Request Flow, 2: Decrypted Records
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [accessStatus, setAccessStatus] = useState<'none' | 'pending' | 'ready'>('none');
  const [patientId, setPatientId] = useState<string>('');

  const [patientData, setPatientData] = useState<{
    patient: Patient;
    records: MedicalRecord[];
    aiInsights: string;
  } | null>(null);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleEndSession = () => {
    setAuthStage(0);
    setPatientCode('');
    setPatientData(null);
    toast.success("Session Terminated Safely");
  };

  // Auto-verify when 6 digits are reached
  useEffect(() => {
    if (patientCode.length === 6 && authStage === 0 && !isSynthesizing) {
      handleVerifyKey(patientCode);
    }
  }, [patientCode, authStage, isSynthesizing]);

  if (authLoading) return null;
  if (!user) {
    return <Navigate to="/login?role=doctor" replace />;
  }

  const handleVerifyKey = async (codeStr?: string) => {
    const code = typeof codeStr === 'string' ? codeStr : patientCode;
    if (!code || code.length < 6) return;

    setIsSynthesizing(true);
    try {
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('clinical_id', code.trim())
        .single();

      if (patientError || !patient) {
        throw new Error("Invalid Clinical Key. Access Denied.");
      }

      setPatientId(patient.id);

      // Check Master Lock FIRST
      if (!patient.doctor_access_enabled) {
        throw new Error("Patient's Global Master Lock is ON. Access strictly denied.");
      }

      // Check Consents
      const { data: consent, error: consentError } = await supabase
        .from('consents')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('doctor_email', user?.email)
        .single();

      if (!consent || consent.status === 'revoked' || consent.status === 'expired') {
        setAccessStatus('none');
        setAuthStage(1); // Go to "Request Access" view
        return;
      }

      if (consent.status === 'pending') {
        setAccessStatus('pending');
        setAuthStage(1);
        return;
      }

      if (consent.status === 'active') {
        // Vault Unlocked
        const { data: records, error: recordsError } = await supabase
          .from('medical_records')
          .select('*')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false });

        if (recordsError) throw recordsError;

        // Fetch Doctor Profile for audit log
        const { data: doctorDetail } = await supabase.from('doctor_details').select('*').eq('user_id', user?.id).single();

        await supabase.from('audit_logs').insert([{
          patient_id: patient.id,
          action_type: 'CLINICAL_DATA_ACCESSED',
          performed_by: user?.id,
          details: { 
            doctor_name: doctorDetail?.name || 'Unknown Doctor',
            specialization: doctorDetail?.specialization || 'General',
            access_time: new Date().toISOString()
          }
        }]);

        setPatientData({
          patient: patient as any,
          records: records || [],
          aiInsights: '' 
        });
        
        setAuthStage(2); 
        toast.success("Intelligence Vault Unlocked");
      }
    } catch (err: any) {
      toast.error(err.message, { position: 'top-center' });
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleRequestAccess = async () => {
    try {
      setIsSynthesizing(true);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour request limit
      
      const { error } = await supabase.from('consents').upsert({
        patient_id: patientId,
        doctor_email: user?.email,
        access_code: patientCode,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      }, { onConflict: 'id' });

      if (error) throw error;
      setAccessStatus('pending');
      toast.success("Access Request Sent to Patient");
    } catch(err: any) {
      toast.error("Failed to send access request");
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full flex flex-col font-sans text-slate-300">
      <DynamicBackgroundGlow />
      
      {/* Header replicated from requested UI */}
      <header className="p-4 pb-4 flex items-center justify-between shadow-2xl z-50 bg-[#060b14]/80 backdrop-blur-md relative border-b border-white/5 w-full md:p-8 md:pb-4">
        <div className="flex items-center gap-4">
          <HeartPulse className="text-red-500 animate-[pulse_2s_ease-in-out_infinite]" size={36} />
          <h1 className="text-xl md:text-3xl font-black text-white tracking-widest uppercase">Doctor: <span className="font-light text-cyan-400">Secure Access</span></h1>
        </div>
        <div className="flex items-center gap-8">
          <Zap className="text-cyan-400 opacity-30" size={20} />
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
            Exit Portal
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 relative z-10 w-full max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          
          {/*STAGE 0 & 1: THE AUTHENTICATION FLOW */}
          {authStage < 2 && (
            <motion.div
              key="auth-flow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              className="mt-12 flex justify-center"
            >
              <div className="w-full max-w-md bg-[#060b14]/80 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl p-10 shadow-[0_0_50px_-10px_rgba(6,182,212,0.3)]">
                
                <div className="flex items-center justify-center gap-3 mb-10 text-cyan-300">
                  <ShieldAlert size={28} />
                  <h2 className="text-xl font-bold tracking-wider text-center text-white">Explicit Patient Consent Required</h2>
                </div>

                {authStage === 0 && (
                  <form onSubmit={(e) => { e.preventDefault(); handleVerifyKey(); }} className="space-y-8">
                    {/* The 6-digit code request  */}
                    <div className="space-y-4 text-center">
                      <label className="text-xs font-black uppercase tracking-widest text-cyan-400/60 block">
                        Enter Patient Clinical Memory Access Key
                      </label>
                      <input 
                        type="text" 
                        maxLength={6} 
                        value={patientCode} 
                        onChange={(e) => setPatientCode(e.target.value.toUpperCase())} 
                        required 
                        placeholder="000000" 
                        className="w-full h-20 bg-black/40 border-b-2 border-white/10 rounded-none px-4 md:px-6 text-3xl md:text-5xl font-black tracking-[0.2em] md:tracking-[0.4em] text-center text-white placeholder-slate-800 focus:border-cyan-500 transition-all outline-none"
                      />
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                        Authorized personnel only. Access is tracked via Neural Audit.
                      </p>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSynthesizing || patientCode.length < 6}
                      className="w-full h-16 bg-white text-black hover:bg-cyan-400 transition-all font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale transition-all duration-500"
                    >
                      {isSynthesizing ? (
                         <>Unlocking Vault...</>
                      ) : (
                         <>Decrypt Longitudinal Record <ArrowRight size={18} /></>
                      )}
                    </button>
                  </form>
                )}

                {authStage === 1 && (
                  <div className="space-y-8 text-center">
                    <p className="text-slate-300 font-medium">Record located, but no active consent found.</p>
                    {accessStatus === 'pending' ? (
                      <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <Lock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-amber-500 mb-2">Request Pending</h3>
                        <p className="text-xs text-slate-400">Waiting for patient to approve your access in their Axis Protocol dashboard.</p>
                        <button 
                          onClick={() => handleVerifyKey()}
                          className="mt-6 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs uppercase tracking-widest font-bold rounded-lg transition-colors"
                        >
                          Check Status
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                           <p className="text-xs text-slate-400 uppercase tracking-widest mb-1 font-bold">Clinical ID</p>
                           <p className="text-2xl font-black tracking-[0.2em] text-cyan-400">{patientCode}</p>
                        </div>
                        <button 
                          onClick={handleRequestAccess}
                          disabled={isSynthesizing}
                          className="w-full h-16 bg-cyan-500 hover:bg-cyan-400 text-black transition-all font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                          {isSynthesizing ? "Requesting..." : "Send Request to Patient"}
                        </button>
                      </div>
                    )}
                    <button 
                      onClick={handleEndSession}
                      className="text-[10px] uppercase font-bold tracking-widest text-slate-500 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/*STAGE 2: THE UNLOCKED PATIENT RECORDS (Replicating the sketch database structure) */}
          {authStage === 2 && patientData && (
            <motion.div
              key="patient-records"
              initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              className="mt-8 bg-[#060b14]/70 backdrop-blur-3xl border border-cyan-500/20 rounded-2xl shadow-[0_0_50px_-10px_rgba(6,182,212,0.2)] overflow-hidden"
            >
              <div className="bg-gradient-to-r from-cyan-950/70 to-blue-950/70 p-6 border-b border-cyan-500/20 flex justify-between items-center">
                <div className="flex gap-8">
                  <div>
                    <div className="flex items-center gap-3">
                      <Table className="text-cyan-400" size={24} />
                      <h3 className="text-xl font-bold text-white tracking-wider uppercase"> {patientData.patient.name}</h3>
                    </div>
                    <p className="text-slate-400 text-[10px] mt-1 uppercase tracking-widest font-black">AXON Neural Identity: {patientData.patient.clinical_id}</p>
                  </div>
                  
                  <div className="flex gap-6 border-l border-white/10 pl-8">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-black mb-1">Age</div>
                      <div className="text-sm font-bold text-white">
                        {patientData.patient.survey_data?.age || '--'}y
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-black mb-1">Blood</div>
                      <div className="text-sm font-bold text-cyan-400">{patientData.patient.blood_type || '--'}</div>
                    </div>
                  </div>
                </div>
                <button onClick={handleEndSession} className="text-xs uppercase tracking-widest font-black hover:text-white transition-colors cursor-pointer border border-white/20 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border-red-500/20">End Session</button>
              </div>

               {/* Gemini Scribe AI Output Section */}
               <div className="p-8 border-b border-white/5 bg-cyan-500/5">
                  {(patientData.patient.health_score_explanation || patientData.records.length > 0) ? (
                    <div className="space-y-8">
                       {/* Section 1: Survey AI Insights (The Health Roadmap) */}
                       {patientData.patient.health_score_explanation && (
                         <div className="bg-[#0c1a2e] border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                            <div className="flex items-center gap-2 mb-4">
                              <Brain className="w-5 h-5 text-cyan-400" />
                              <h4 className="text-sm uppercase tracking-widest font-bold text-cyan-400">AXON Neural Health Roadmap (Survey Insight)</h4>
                            </div>
                            <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                               <Markdown>{patientData.patient.health_score_explanation}</Markdown>
                            </div>
                         </div>
                       )}

                       {/* Section 2: Medical Record Extraction (The Scribe) */}
                       <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-4">
                            <Activity className="w-5 h-5 text-emerald-400" />
                            <h4 className="text-sm uppercase tracking-widest font-bold text-emerald-400">Clinical Harmonizer & Survey Data</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-4">
                               <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                                  <h5 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Key Clinical Findings</h5>
                                  <ul className="space-y-1">
                                    {patientData.records.length > 0 && (patientData.records[0].key_findings || []).slice(0, 3).map((f: string, i: number) => (
                                      <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                                        <span className="w-1 h-1 bg-cyan-400 rounded-full" /> {f}
                                      </li>
                                    ))}
                                    {patientData.patient.survey_data?.chronicDiseases?.length > 0 && patientData.patient.survey_data.chronicDiseases[0] !== 'None' && (
                                      patientData.patient.survey_data.chronicDiseases.map((d: string, i: number) => (
                                        <li key={`d-${i}`} className="text-xs text-amber-400 flex items-center gap-2">
                                          <span className="w-1 h-1 bg-amber-400 rounded-full" /> Declared Condition: {d}
                                        </li>
                                      ))
                                    )}
                                    {!(patientData.records[0]?.key_findings?.length) && !(patientData.patient.survey_data?.chronicDiseases?.length) && <li className="text-xs text-slate-500 italic">No structured findings extracted yet.</li>}
                                  </ul>
                               </div>
                               
                               <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5">
                                  <h5 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Lifestyle Biometrics (Survey)</h5>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <div className="text-[9px] text-slate-500 uppercase">Sleep</div>
                                      <div className="text-xs text-slate-300">{patientData.patient.sleep_hours || '--'}h / night</div>
                                    </div>
                                    <div>
                                      <div className="text-[9px] text-slate-500 uppercase">Smoker</div>
                                      <div className="text-xs text-slate-300">{patientData.patient.is_smoker ? 'Yes' : 'No'}</div>
                                    </div>
                                    <div>
                                      <div className="text-[9px] text-slate-500 uppercase">Water</div>
                                      <div className="text-xs text-slate-300">{patientData.patient.water_intake || '--'}L / day</div>
                                    </div>
                                    <div>
                                      <div className="text-[9px] text-slate-500 uppercase">Diet</div>
                                      <div className="text-xs text-slate-300">{patientData.patient.survey_data?.diet_type || 'Unknown'}</div>
                                    </div>
                                  </div>
                               </div>
                             </div>
                             
                             <div className="space-y-4">
                               <div className="p-4 bg-brand-purple/5 rounded-xl border border-brand-purple/10">
                                  <h5 className="text-[10px] uppercase tracking-widest text-brand-purple font-bold mb-2">Longitudinal Risk Projection</h5>
                                  <div className="flex flex-wrap gap-2">
                                    {(patientData.records[0]?.risk_flags || []).map((r: string, i: number) => (
                                      <span key={i} className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-red-500/20 text-red-400 rounded">
                                        {r}
                                      </span>
                                    ))}
                                    {patientData.patient.survey_data?.stress_level === 'High' && (
                                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-amber-500/20 text-amber-500 rounded">
                                        STRESS_LOAD_HIGH
                                      </span>
                                    )}
                                    {!(patientData.records[0]?.risk_flags?.length) && <span className="text-[10px] text-slate-500 italic">No critical risks projected from records.</span>}
                                  </div>
                               </div>

                               {/* Display Survey Medical Context */}
                               {patientData.patient.survey_data?.had_recent_checkup === 'Yes' && (
                                 <div className="p-4 bg-cyan-950/20 rounded-xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="text-[10px] uppercase tracking-widest text-cyan-500 font-bold flex items-center gap-2">
                                        <Building2 className="w-3 h-3" /> Recent Associated Clinic
                                      </h5>
                                      <span className="text-[8px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded uppercase font-black tracking-tighter">Verified Node</span>
                                    </div>
                                    <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">{patientData.patient.survey_data.recent_hospital || "AXON Clinical Network"}</div>
                                    <div className="text-[10px] text-slate-400 italic">Patient declared a recent hospital visit in the health survey.</div>
                                    
                                    {patientData.patient.survey_data?.recent_extracted_data && (
                                      <div className="mt-3 pt-3 border-t border-cyan-500/20">
                                        <div className="text-[9px] text-slate-500 uppercase mb-1">Extracted Summary:</div>
                                        <div className="text-[10px] text-slate-300 italic line-clamp-2">
                                          "{patientData.patient.survey_data.recent_extracted_data.data?.summary || "Survey artifact contains structured findings."}"
                                        </div>
                                      </div>
                                    )}
                                 </div>
                               )}
                             </div>
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-500 italic text-sm">No AI cognitive analysis available for this patient baseline.</div>
                  )}
               </div>
              
              <div className="p-8">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-cyan-300">
                      <th className="pb-4 font-black text-xs uppercase tracking-widest">Document Title</th>
                      <th className="pb-4 font-black text-xs uppercase tracking-widest">Type</th>
                      <th className="pb-4 font-black text-xs uppercase tracking-widest">Clinical Summary</th>
                      <th className="pb-4 font-black text-xs uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300 divide-y divide-white/5 text-sm leading-relaxed">
                    {patientData.records.length > 0 ? patientData.records.map((r: any, index) => (
                      <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-6 pr-6">
                          <div className="font-bold text-white text-base">{r.title}</div>
                          <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1 font-black">{r.date_detected || r.date}</div>
                        </td>
                        <td className="py-6 pr-6">
                          <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                            {r.document_type || r.type}
                          </span>
                        </td>
                        <td className="py-6 pr-6 max-w-md">
                           <p className="text-xs text-slate-400 leading-relaxed italic line-clamp-2">
                             "{r.summary || "No automated summary available."}"
                           </p>
                        </td>
                        <td className="py-6 text-right">
                           <a 
                             href={r.file_url || r.source_path} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-xs font-black uppercase tracking-widest text-cyan-400 hover:text-white transition-colors"
                           >
                             View Raw Artifact
                           </a>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-20 text-center text-slate-500 uppercase tracking-[0.3em] font-black opacity-20">
                          Initialization Required: No Records Found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <LogoutConfirmModal 
        isOpen={isLogoutModalOpen} 
        onClose={() => setIsLogoutModalOpen(false)} 
        onConfirm={() => {
           setIsLogoutModalOpen(false);
           signOut();
        }} 
      />
    </div>
  );
}
