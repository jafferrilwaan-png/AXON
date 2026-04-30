import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Brain, Star, Activity, ArrowRight, Save, Clock, Lock } from 'lucide-react';
import { GlassCard, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { getAIRecommendation } from '../../lib/geminiSurvey';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown';

export default function AiInsights() {
  const { patient } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<string | null>(null);
  const [displayedInsight, setDisplayedInsight] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!patient?.profile_complete) {
      navigate('/portal/patient/profile');
      return;
    }

    const generate = async () => {
      // 1. Check if we already have a saved insight to avoid unnecessary Gemini API calls (Respect Quota)
      if (patient.health_score_explanation) {
        setInsight(patient.health_score_explanation);
        setDisplayedInsight(patient.health_score_explanation);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const aiResponse = getAIRecommendation(patient.survey_data || {});
        const [res] = await Promise.all([aiResponse, new Promise(resolve => setTimeout(resolve, 2000))]);
        
        if (!res) throw new Error("Empty response from clinical engine");
        
        setInsight(res);
        setDisplayedInsight(res);
        setIsTyping(false);
      } catch (error: any) {
        console.error("AI Insight Error:", error);
        let userMessage = "An error occurred while generating insights. Please try again.";
        
        // Handling Gemini Quota Limits (User-friendly message)
        const errorMessage = error?.message || "";
        const errorStr = typeof error === 'object' ? JSON.stringify(error).toLowerCase() : String(error).toLowerCase();
        
        if (errorMessage.includes("429") || errorStr.includes("quota") || errorStr.includes("resource_exhausted") || errorStr.includes("429")) {
          userMessage = "### AI Intelligence Protocol: Daily Quota Reached\n\nThe AXON neural clinical engine has reached its daily processing limit (20 requests for free tier). \n\n**Action Path:**\n1. Please check back tomorrow for your full AI roadmap.\n2. Your existing survey data remains securely stored in our encrypted baseline.\n3. The clinical scribe for your PDFs remains operational if you have remaining quota for those models.";
        }
        
        setInsight(userMessage);
        setDisplayedInsight(userMessage);
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [patient]);

  const handleSaveToVault = async () => {
    if (!insight || !patient) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('patients')
        .update({ 
          health_score_explanation: insight,
          updated_at: new Date().toISOString()
        })
        .eq('id', patient.id);

      if (error) throw error;
      
      alert('AI Insights successfully securely synced to your health vault.');
    } catch (error: any) {
      console.error("Save Error:", error);
      alert('Failed to save insights: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <motion.div
           animate={{ 
             opacity: [0.5, 1, 0.5],
             scale: [0.95, 1.05, 0.95],
             filter: ["drop-shadow(0 0 10px rgba(168,85,247,0.2))", "drop-shadow(0 0 30px rgba(168,85,247,0.6))", "drop-shadow(0 0 10px rgba(168,85,247,0.2))"]
           }}
           transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
           className="w-24 h-24 rounded-full bg-brand-purple/20 border-2 border-brand-purple/50 flex flex-col items-center justify-center mb-6"
        >
          <Brain className="w-10 h-10 text-brand-purple" />
        </motion.div>
        <h2 className="text-xl font-display font-medium text-brand-purple mb-2">Analyzing Clinical Baseline...</h2>
        <p className="text-slate-500 text-sm font-mono tracking-widest uppercase">Formulating AI Recommendations</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto w-full mb-20 relative z-10">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-brand-purple flex items-center gap-3">
            <Brain className="w-8 h-8" />
            AI Clinical Teller
          </h1>
          <p className="text-slate-400 mt-2">Personalized Health Roadmap generated by AXON Gemini 1.5 Pro</p>
        </div>
      </div>

      <GlassCard className="p-8 border-brand-purple/30 bg-slate-950/60 shadow-[0_0_50px_rgba(168,85,247,0.05)]">
         <div className="prose prose-invert prose-purple max-w-none">
           {displayedInsight && (
             <div className="markdown-body text-slate-300 leading-relaxed space-y-4">
               <Markdown>{displayedInsight}</Markdown>
             </div>
           )}
           {isTyping && (
             <div className="flex gap-1 mt-4">
               <div className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-bounce" />
               <div className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-bounce [animation-delay:0.2s]" />
               <div className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-bounce [animation-delay:0.4s]" />
             </div>
           )}
         </div>
      </GlassCard>

      <div className="mt-8 flex justify-center gap-4">
         <Button variant="outline" className="border-brand-purple/50 text-brand-purple hover:bg-brand-purple/10" onClick={() => navigate('/portal/patient/dashboard')}>
            Return to Dashboard
         </Button>
         <Button 
            className="bg-brand-purple hover:bg-brand-purple/80 text-white gap-2 font-bold tracking-widest disabled:opacity-50"
            onClick={handleSaveToVault}
            disabled={isSaving || isTyping || !insight}
         >
            {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Synching...' : 'Save to Vault'}
         </Button>
      </div>
    </div>
  );
}
