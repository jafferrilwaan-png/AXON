import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { GlassCard, Button, Input } from '../../components/ui';
import { Activity, Beaker, HeartPulse, User, KeyRound, Building2, Stethoscope, UploadCloud, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { extractMedicalData } from '../../lib/gemini';

export const calculateBMI = (weight: number, heightCm: number) => {
  const heightM = heightCm / 100;
  return (weight / (heightM * heightM)).toFixed(1);
};

export const SURVEY_QUESTIONS = [
  "Age",
  "Blood Pressure (Systolic/Diastolic)",
  "Fasting Sugar Level (mg/dL)",
  "Existing Chronic Diseases",
  "Daily Water Intake (Liters)",
  "Sleep Hours",
  "Family Medical History",
  "Resting Heart Rate",
  "Alcohol Frequency",
  "Smoker Status",
  "Current Medications",
  "Known Allergies",
  "Diet Type",
  "Exercise Frequency",
  "Stress Level",
  "Recent Hospital Checkup"
];

const CHRONIC_DISEASES = [
  "Diabetes", "Asthma", "Hypertension", "Cancer", "Heart Disease", "PCOD", "None"
];

export default function Profile() {
  const { patient, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    age: patient?.survey_data?.age || '',
    weight: patient?.weight || '',
    height: patient?.height || '',
    bp_systolic: patient?.bp_systolic || '',
    bp_diastolic: patient?.bp_diastolic || '',
    blood_sugar: patient?.blood_sugar || '',
    water_intake: patient?.water_intake || '',
    sleep_hours: patient?.sleep_hours || '',
    heart_rate: patient?.heart_rate || '',
    alcohol_freq: patient?.alcohol_freq || 'None',
    is_smoker: patient?.is_smoker ? 'Yes' : 'No',
    manualDisease: '',
    family_history: patient?.survey_data?.family_history || '',
    current_medications: patient?.survey_data?.current_medications || '',
    known_allergies: patient?.survey_data?.known_allergies || '',
    diet_type: patient?.survey_data?.diet_type || 'Balanced',
    exercise_freq: patient?.survey_data?.exercise_freq || '1-2 times/week',
    stress_level: patient?.survey_data?.stress_level || 'Moderate',
    had_recent_checkup: patient?.survey_data?.had_recent_checkup || 'No',
    recent_hospital: patient?.survey_data?.recent_hospital || '',
  });

  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedRecord, setExtractedRecord] = useState<any | null>(patient?.survey_data?.recent_extracted_data || null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [newKey, setNewKey] = useState('');

  useEffect(() => {
    if (patient?.survey_data?.chronicDiseases) {
      setSelectedDiseases(patient.survey_data.chronicDiseases);
    }
  }, [patient]);

  const handleDiseaseToggle = (disease: string) => {
    if (disease === 'None') {
      setSelectedDiseases(['None']);
      return;
    }
    
    let newDiseases = selectedDiseases.filter(d => d !== 'None');
    if (newDiseases.includes(disease)) {
      newDiseases = newDiseases.filter(d => d !== disease);
    } else {
      newDiseases.push(disease);
    }
    setSelectedDiseases(newDiseases);
  };

  const handleManualDiseaseAdd = () => {
    if (formData.manualDisease.trim() && !selectedDiseases.includes(formData.manualDisease)) {
      const newDiseases = selectedDiseases.filter(d => d !== 'None');
      newDiseases.push(formData.manualDisease.trim());
      setSelectedDiseases(newDiseases);
      setFormData(prev => ({ ...prev, manualDisease: '' }));
    }
  };

  const currentBMI = formData.weight && formData.height 
    ? calculateBMI(Number(formData.weight), Number(formData.height)) 
    : '--';

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      const base64Data = result.split(',')[1];
      
      try {
        const extractedData = await extractMedicalData(base64Data, file.type);
        setExtractedRecord({
          file_name: file.name,
          upload_date: new Date().toISOString(),
          data: extractedData
        });
        toast.success("AI Analysis Complete: Record digitized.");
      } catch (err: any) {
        toast.error("Failed to analyze PDF: " + err.message);
      } finally {
        setIsExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!patient?.user_id) return;
    
    setLoading(true);
    
    try {
      const survey_data = {
        age: Number(formData.age),
        chronicDiseases: selectedDiseases,
        calculated_bmi: currentBMI,
        family_history: formData.family_history,
        current_medications: formData.current_medications,
        known_allergies: formData.known_allergies,
        diet_type: formData.diet_type,
        exercise_freq: formData.exercise_freq,
        stress_level: formData.stress_level,
        had_recent_checkup: formData.had_recent_checkup,
        recent_hospital: formData.recent_hospital,
        recent_extracted_data: extractedRecord
      };
      
      const clinicalId = patient?.clinical_id || `${Math.floor(100000 + Math.random() * 900000)}`;
      setNewKey(clinicalId);
      
      const { error } = await supabase
        .from('patients')
        .update({
          weight: Number(formData.weight) || null,
          height: Number(formData.height) || null,
          bp_systolic: Number(formData.bp_systolic) || null,
          bp_diastolic: Number(formData.bp_diastolic) || null,
          blood_sugar: Number(formData.blood_sugar) || null,
          water_intake: Number(formData.water_intake) || null,
          sleep_hours: Number(formData.sleep_hours) || null,
          heart_rate: Number(formData.heart_rate) || null,
          alcohol_freq: formData.alcohol_freq,
          is_smoker: formData.is_smoker === 'Yes',
          survey_data,
          clinical_id: clinicalId,
          profile_complete: true,
          onboarding_complete: true, // Also set onboarding complete
          doctor_access_enabled: true // Auto-enable access since they get a PIN
        })
        .eq('user_id', patient.user_id);
        
      if (error) throw error;

      // If we have an extracted record, also save it to medical_records table for the longitudinal history
      if (extractedRecord && !patient?.survey_data?.recent_extracted_data) {
        await supabase
          .from('medical_records')
          .insert({
            patient_id: patient.id,
            title: extractedRecord.data?.title || `Checkup at ${formData.recent_hospital}`,
            type: extractedRecord.data?.type?.toLowerCase() || 'note',
            date: extractedRecord.data?.date || new Date().toISOString().split('T')[0],
            provider: formData.recent_hospital,
            summary_json: extractedRecord.data,
            data: extractedRecord.data
          });
      }
      
      await refreshProfile();
      toast.success("Health setup complete. AXON Neural Key generated.");
      setShowPinModal(true);
      
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  if (showPinModal) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md relative z-50">
        <GlassCard className="max-w-md w-full p-8 text-center space-y-6 shadow-[0_0_50px_-10px_rgba(168,85,247,0.3)] border-brand-purple/30 bg-slate-900">
          <div className="w-20 h-20 bg-brand-purple/20 rounded-full mx-auto flex items-center justify-center">
            <KeyRound className="w-10 h-10 text-brand-purple" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">AXON Key Issued</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your secure 6-digit Doctor Key has been generated. This provides cryptographically secure access for any authorized doctor to decrypt your longitudinal memory.
          </p>
          <div className="py-6 bg-black/40 rounded-xl border border-white/5">
             <div className="text-5xl font-mono tracking-[0.3em] font-bold text-brand-purple">{newKey}</div>
          </div>
          <Button onClick={() => navigate('/portal/patient/ai-insights')} className="w-full h-12 text-sm font-bold tracking-widest uppercase bg-brand-purple hover:bg-brand-purple/80">Access AI Insights</Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto w-full">
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-white mb-2">Advanced Health Setup</h1>
            <p className="text-slate-400">Complete your clinical vitals and physical metrics to unlock deep AI recommendations.</p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center justify-center hidden md:flex"
          >
            <motion.img 
              src="https://i.ibb.co/Cpsv0qY7/73024ef0-7fe4-4884-96b1-58af0a49ff7c.png" 
              alt="AXON Logo" 
              className="w-[90px] md:w-[120px] object-contain"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Biometrics */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-brand-blue flex items-center gap-2 mb-6">
              <User className="w-5 h-5" /> Biometrics & BMI
            </h3>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Input 
                label="Age (Years)" 
                type="number"
                value={formData.age}
                onChange={e => setFormData({...formData, age: e.target.value})}
              />
              <Input 
                label="Weight (kg)" 
                type="number"
                value={formData.weight}
                onChange={e => setFormData({...formData, weight: e.target.value})}
              />
              <Input 
                label="Height (cm)" 
                type="number"
                value={formData.height}
                onChange={e => setFormData({...formData, height: e.target.value})}
              />
            </div>
            
            <div className="p-4 bg-brand-blue/10 rounded-xl border border-brand-blue/20 flex justify-between items-center">
              <span className="text-slate-300 font-medium">Calculated BMI</span>
              <span className="text-2xl font-bold font-mono text-cyan-400">{currentBMI}</span>
            </div>
          </GlassCard>

          {/* Clinical Vitals */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2 mb-6">
              <HeartPulse className="w-5 h-5" /> Clinical Vitals
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Sys. BP (mmHg)" 
                type="number"
                placeholder="120"
                value={formData.bp_systolic}
                onChange={e => setFormData({...formData, bp_systolic: e.target.value})}
              />
              <Input 
                label="Dia. BP (mmHg)" 
                type="number"
                placeholder="80"
                value={formData.bp_diastolic}
                onChange={e => setFormData({...formData, bp_diastolic: e.target.value})}
              />
              <Input 
                label="Fasting Sugar (mg/dL)" 
                type="number"
                value={formData.blood_sugar}
                onChange={e => setFormData({...formData, blood_sugar: e.target.value})}
              />
              <Input 
                label="Resting HR (bpm)" 
                type="number"
                value={formData.heart_rate}
                onChange={e => setFormData({...formData, heart_rate: e.target.value})}
              />
            </div>
          </GlassCard>

          {/* Lifestyle */}
          <GlassCard className="p-6">
             <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5" /> Lifestyle Metrics
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Water Intake (L/day)" 
                type="number"
                value={formData.water_intake}
                onChange={e => setFormData({...formData, water_intake: e.target.value})}
              />
              <Input 
                label="Sleep Hours" 
                type="number"
                value={formData.sleep_hours}
                onChange={e => setFormData({...formData, sleep_hours: e.target.value})}
              />
              
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Smoker Status</label>
                <select 
                  className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-brand-blue outline-none"
                  value={formData.is_smoker}
                  onChange={(e) => setFormData({...formData, is_smoker: e.target.value})}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Alcohol Freq.</label>
                <select 
                  className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  value={formData.alcohol_freq}
                  onChange={(e) => setFormData({...formData, alcohol_freq: e.target.value})}
                >
                  <option>None</option>
                  <option>Occasional</option>
                  <option>Frequent</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Diet Type</label>
                <select 
                  className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-brand-blue outline-none"
                  value={formData.diet_type}
                  onChange={(e) => setFormData({...formData, diet_type: e.target.value})}
                >
                  <option>Balanced</option>
                  <option>Vegetarian</option>
                  <option>Vegan</option>
                  <option>Keto</option>
                  <option>Paleo</option>
                  <option>Other</option>
                </select>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Exercise Freq.</label>
                <select 
                  className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-brand-purple outline-none"
                  value={formData.exercise_freq}
                  onChange={(e) => setFormData({...formData, exercise_freq: e.target.value})}
                >
                  <option>None</option>
                  <option>1-2 times/week</option>
                  <option>3-4 times/week</option>
                  <option>5+ times/week</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Stress Level</label>
                <select 
                  className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-red-500 outline-none"
                  value={formData.stress_level}
                  onChange={(e) => setFormData({...formData, stress_level: e.target.value})}
                >
                  <option>Low</option>
                  <option>Moderate</option>
                  <option>High</option>
                  <option>Severe</option>
                </select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <Input 
                label="Family Medical History" 
                placeholder="e.g. Mother had diabetes..."
                value={formData.family_history}
                onChange={e => setFormData({...formData, family_history: e.target.value})}
              />
              <Input 
                label="Current Medications" 
                placeholder="e.g. Lisinopril 10mg"
                value={formData.current_medications}
                onChange={e => setFormData({...formData, current_medications: e.target.value})}
              />
              <Input 
                label="Known Allergies" 
                placeholder="e.g. Penicillin, Peanuts"
                value={formData.known_allergies}
                onChange={e => setFormData({...formData, known_allergies: e.target.value})}
              />
            </div>
          </GlassCard>

          {/* Recent Checkup Analysis */}
          <GlassCard className="p-8 border-white/5 bg-white/[0.01]">
             <h3 className="text-lg font-black uppercase tracking-tighter text-cyan-400 flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-cyan-400/10 flex items-center justify-center">
                <Stethoscope className="w-5 h-5" />
              </div>
              Clinical Intelligence Ingestion
            </h3>
            
            <div className="space-y-8">
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Recent Hospital Transaction?</label>
                <div className="flex gap-4">
                  {['No', 'Yes'].map(option => (
                    <button
                      key={option}
                      onClick={() => setFormData({...formData, had_recent_checkup: option})}
                      className={`flex-1 py-4 px-6 rounded-2xl border-2 transition-all text-xs font-black uppercase tracking-widest ${
                        formData.had_recent_checkup === option
                        ? 'bg-brand-blue/20 border-brand-blue text-white shadow-[0_0_20px_rgba(52,144,220,0.1)]'
                        : 'bg-white/[0.02] border-white/5 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {formData.had_recent_checkup === 'Yes' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 gap-6">
                    <Input 
                      label="Physician / Hospital Node"
                      placeholder="e.g. AXON Central Registry"
                      value={formData.recent_hospital}
                      onChange={e => setFormData({...formData, recent_hospital: e.target.value})}
                      className="bg-white/[0.02]"
                    />

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Digitize Physical Artifact (PDF/Scan)</label>
                      <div className="relative group overflow-hidden rounded-3xl">
                        <input 
                          type="file" 
                          accept="application/pdf,image/*" 
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        />
                        <div className={`p-10 border-2 border-dashed rounded-[inherit] text-center transition-all duration-500 ${
                          isExtracting 
                          ? 'border-brand-blue bg-brand-blue/10' 
                          : 'border-white/10 group-hover:border-brand-blue/50 group-hover:bg-brand-blue/5 bg-white/[0.01]'
                        }`}>
                          <div className="flex flex-col items-center gap-4">
                            {isExtracting ? (
                               <div className="relative">
                                 <Loader2 size={40} className="animate-spin text-brand-blue" />
                                 <motion.div 
                                   className="absolute inset-0 bg-brand-blue rounded-full blur-xl opacity-20"
                                   animate={{ scale: [1, 1.5, 1] }}
                                   transition={{ duration: 1, repeat: Infinity }}
                                 />
                               </div>
                            ) : (
                               <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-brand-blue/20 transition-colors">
                                 <UploadCloud size={32} className="text-slate-600 group-hover:text-brand-blue transition-colors" />
                               </div>
                            )}
                            <div className="space-y-1">
                              <div className="text-sm font-black uppercase tracking-widest text-white">
                                {isExtracting ? "Extracting Neural Vitals..." : "Initialize Artifact Upload"}
                              </div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">PDF, PNG, JPG accepted for AI Ingestion</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {extractedRecord && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-gradient-to-br from-brand-blue/10 to-transparent border border-brand-blue/20 rounded-3xl space-y-6 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 blur-[50px] -z-10" />
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="px-2 py-1 bg-brand-blue text-white text-[8px] font-black uppercase tracking-widest rounded flex items-center gap-1">
                            <CheckCircle2 size={10} /> AXON Verified
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate max-w-[200px]">
                            {extractedRecord.file_name}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest bg-brand-blue/10 px-3 py-1 rounded-full border border-brand-blue/20">
                          {extractedRecord.data?.document_type || extractedRecord.data?.type || 'Clinical Report'}
                        </span>
                      </div>

                      <div className="bg-black/60 backdrop-blur-xl p-5 rounded-2xl border border-white/5">
                        <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Longitudinal Summary Preview</h5>
                        <p className="text-xs text-white leading-relaxed font-medium italic border-l-2 border-brand-blue pl-4">
                          "{extractedRecord.data?.summary || extractedRecord.data?.snippet || 'Synthesizing artifact data into neural history...'}"
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                          <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Top Finding</div>
                          <div className="text-[10px] text-slate-200 font-bold uppercase tracking-tight">
                            {extractedRecord.data?.key_findings?.[0] || extractedRecord.data?.title || 'System Baseline'}
                          </div>
                        </div>
                        <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                          <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Ingestion Date</div>
                          <div className="text-[10px] text-slate-200 font-bold uppercase tracking-tight">
                            {new Date().toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>
          </GlassCard>
          
          {/* Chronic Diseases */}
          <GlassCard className="p-6">
             <h3 className="text-lg font-bold text-brand-purple flex items-center gap-2 mb-6">
              <Beaker className="w-5 h-5" /> Chronic Conditions
            </h3>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {CHRONIC_DISEASES.map(disease => (
                <button
                  key={disease}
                  onClick={() => handleDiseaseToggle(disease)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    selectedDiseases.includes(disease) 
                      ? 'bg-brand-purple/20 text-brand-purple border-brand-purple/50' 
                      : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {disease}
                </button>
              ))}
              {selectedDiseases.filter(d => !CHRONIC_DISEASES.includes(d)).map(disease => (
                <button
                  key={disease}
                  onClick={() => handleDiseaseToggle(disease)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-brand-purple/20 text-brand-purple border border-brand-purple/50"
                >
                  {disease} (x)
                </button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Input 
                className="flex-1"
                placeholder="Add condition..."
                value={formData.manualDisease}
                onChange={e => setFormData({...formData, manualDisease: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && handleManualDiseaseAdd()}
              />
              <Button onClick={handleManualDiseaseAdd} variant="outline" className="mt-[22px]">Add</Button>
            </div>
          </GlassCard>
        </div>
        
        <div className="pt-6 border-t border-white/5 flex justify-end">
          <Button onClick={handleSave} loading={loading} className="px-8 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold h-12 rounded-xl">
            Complete Setup
          </Button>
        </div>
      </div>
    </div>
  );
}
