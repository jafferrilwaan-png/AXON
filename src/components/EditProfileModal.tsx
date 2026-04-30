import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Camera, Copy, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Input, Button } from './ui';

export const EditProfileModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { patient, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: patient?.name || '',
    blood_type: patient?.blood_type || '',
    weight: patient?.weight || '',
    activity_level: patient?.activity_level || 'moderate',
  });
  
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (patient?.clinical_id) {
      navigator.clipboard.writeText(patient.clinical_id);
      setCopied(true);
      toast.success("Clinical ID copied");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file || !patient?.user_id) return;
     
     setLoading(true);
     try {
       const fileExt = file.name.split('.').pop();
       const fileName = `${patient.user_id}/${Date.now()}.${fileExt}`;
       
       const { error: uploadError } = await supabase.storage
         .from('profile-pictures')
         .upload(fileName, file);
         
       if (uploadError) throw uploadError;
       
       const { data: { publicUrl } } = supabase.storage
         .from('profile-pictures')
         .getPublicUrl(fileName);
         
       const { error: dbError } = await supabase
         .from('patients')
         .update({ profile_picture_url: publicUrl })
         .eq('user_id', patient.user_id);
         
       if (dbError) throw dbError;
       
       toast.success("Profile picture updated!");
       await refreshProfile();
     } catch (err: any) {
         console.error(err);
         toast.error("Upload failed");
     } finally {
         setLoading(false);
     }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient?.user_id) return;
    
    setLoading(true);
    try {
      let vitalityScore = 70;
      if (formData.activity_level === 'athletic') vitalityScore = 95;
      else if (formData.activity_level === 'active') vitalityScore = 85;
      else if (formData.activity_level === 'moderate') vitalityScore = 75;
      else if (formData.activity_level === 'sedentary') vitalityScore = 60;
      
      const { error } = await supabase
        .from('patients')
        .update({
          name: formData.name,
          blood_type: formData.blood_type,
          weight: formData.weight ? parseFloat(formData.weight as string) : null,
          activity_level: formData.activity_level,
          health_vitality_score: vitalityScore
        })
        .eq('user_id', patient.user_id);
        
      if (error) throw error;
      
      toast.success("Profile updated successfully!");
      await refreshProfile();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-slate-900/50">
          <h2 className="text-xl font-bold text-white tracking-wide">Edit Profile</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex justify-center mb-6">
             <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-brand-blue/30 bg-slate-800">
                   {patient?.profile_picture_url ? (
                     <img src={patient.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                     <div className="flex items-center justify-center h-full text-slate-500">No Image</div>
                   )}
                </div>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 p-2 bg-brand-blue text-white rounded-full shadow-lg group-hover:scale-110 transition-transform"
                >
                   <Camera className="w-4 h-4" />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
             </div>
          </div>
          
          <div className="p-4 bg-slate-950 rounded-xl border border-white/5 flex items-center justify-between">
             <div className="text-sm text-slate-500 font-medium tracking-wide">AXON ID</div>
             <div className="flex items-center gap-3">
               <div className="font-mono text-xl font-bold text-cyan-400 tracking-[0.2em]">{patient?.clinical_id || '------'}</div>
               <button type="button" onClick={handleCopy} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
               </button>
             </div>
          </div>

          <Input 
            label="Full Name" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Blood Type" 
              placeholder="e.g. O+"
              value={formData.blood_type}
              onChange={(e) => setFormData({...formData, blood_type: e.target.value})}
            />
            <Input 
              label="Weight (kg)" 
              type="number"
              step="0.1"
              value={formData.weight}
              onChange={(e) => setFormData({...formData, weight: e.target.value})}
            />
          </div>
          
          <div className="space-y-1.5 w-full">
            <label className="text-sm font-medium text-slate-400 ml-1">Activity Level</label>
            <select
              title="Activity Level"
              value={formData.activity_level}
              onChange={(e) => setFormData({...formData, activity_level: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue/50 transition-all appearance-none"
            >
              <option value="sedentary">Sedentary</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
              <option value="athletic">Athletic</option>
            </select>
          </div>
          
          <div className="pt-2 flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Save Changes
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
