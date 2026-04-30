import React, { useState } from 'react';
import { Database, Copy, CheckCircle2, AlertCircle, Terminal, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

const SQL_SCRIPT = `-- AXON Database Schema
-- Run this in your Supabase SQL Editor

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create updated_at logic helper
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Profiles Table (Extended Patient Profile)
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  clinical_id TEXT UNIQUE,
  name TEXT NOT NULL,
  dob DATE,
  blood_type TEXT,
  height DECIMAL,
  weight DECIMAL,
  activity_level TEXT,
  allergies TEXT[] DEFAULT '{}',
  bp_systolic INTEGER,
  bp_diastolic INTEGER,
  heart_rate INTEGER,
  blood_sugar INTEGER,
  sleep_hours DECIMAL,
  water_intake DECIMAL,
  is_smoker BOOLEAN DEFAULT false,
  alcohol_freq TEXT,
  family_history TEXT[] DEFAULT '{}',
  onboarding_complete BOOLEAN DEFAULT false,
  profile_complete BOOLEAN DEFAULT false,
  survey_data JSONB DEFAULT '{}'::jsonb,
  doctor_access_enabled BOOLEAN DEFAULT true,
  health_vitality_score INTEGER,
  health_score_explanation TEXT,
  improvement_areas TEXT[],
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Doctor Profiles Table
CREATE TABLE IF NOT EXISTS public.doctor_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  specialization TEXT,
  hospital_name TEXT,
  license_id TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Medical Records Table
CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  provider TEXT,
  raw_content TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  source_path TEXT,
  file_url TEXT,
  summary_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Consents Table
CREATE TABLE IF NOT EXISTS public.consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  doctor_email TEXT,
  access_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  ip_address TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Triggers
DROP TRIGGER IF EXISTS update_patients_updated_at ON public.patients;
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_doctor_details_updated_at ON public.doctor_details;
CREATE TRIGGER update_doctor_details_updated_at BEFORE UPDATE ON public.doctor_details FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 8. RLS --
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users browse their own AXON profile" ON public.patients;
CREATE POLICY "Users browse their own AXON profile" ON public.patients FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Doctors view all doctor profiles" ON public.doctor_details FOR SELECT USING (true);
CREATE POLICY "Doctors manage their own profile" ON public.doctor_details FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Patients manage their AXON records" ON public.medical_records FOR ALL USING (patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()));
CREATE POLICY "Patients manage AXON access codes" ON public.consents FOR ALL USING (patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()));
CREATE POLICY "Patients insert their own neuro-audit trail" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()));
CREATE POLICY "Doctors insert neuro-audit trail" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.doctor_details WHERE user_id = auth.uid()));
CREATE POLICY "Patients view their neuro-audit trail" ON public.audit_logs FOR SELECT USING (patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()));

-- 9. Storage --
INSERT INTO storage.buckets (id, name, public) VALUES ('medical-reports', 'medical-reports', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-pictures', 'profile-pictures', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'medical-reports' OR bucket_id = 'profile-pictures');
CREATE POLICY "Users can view their own files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'medical-reports' AND (owner = auth.uid()::text));
CREATE POLICY "Anyone can view profile pictures" ON storage.objects FOR SELECT USING (bucket_id = 'profile-pictures');`;

export default function DatabaseSetup() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopied(true);
    toast.success('SQL Script copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 pt-24">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Database className="w-7 h-7 text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">System Infrastructure Setup</h1>
          </div>
          <p className="text-slate-400 text-lg">
            Finalize your AXON Intelligence deployment by configuring the database schema and security rules in Supabase.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Step 1: SQL Editor */}
          <section className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="flex items-center justify-between px-6 py-4 bg-slate-800/50 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-400" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">SQL Schema Script</span>
                </div>
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md text-xs font-medium transition-colors"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy SQL'}
                </button>
              </div>
              <div className="relative group">
                <pre className="p-6 text-sm font-mono text-slate-300 overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                  {SQL_SCRIPT}
                </pre>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none h-12 bottom-0" />
              </div>
            </div>
          </section>

          {/* Action Checklist */}
          <aside className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                Deployment Checklist
              </h3>
              <div className="space-y-4">
                <StepItem 
                  number="01" 
                  title="Open Supabase" 
                  desc="Navigate to your Supabase Project Dashboard."
                  link="https://database.new"
                />
                <StepItem 
                  number="02" 
                  title="SQL Editor" 
                  desc="Select 'SQL Editor' from the left sidebar."
                />
                <StepItem 
                  number="03" 
                  title="New Query" 
                  desc="Click '+ New query' and paste the script."
                />
                <StepItem 
                  number="04" 
                  title="Run Script" 
                  desc="Press 'Run' to initialize AXON tables."
                />
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-1 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-blue-300 mb-1">Why this is needed?</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    AXON uses a strict Row-Level Security (RLS) model to ensure medical data belongs ONLY to the patient. This script sets up those gates and the neural data structure required for AI synthesis.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="border-t border-slate-800 pt-8 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            System Intelligence Layer: <span className="text-blue-400 font-mono tracking-tighter">v4.0.2-AXON</span>
          </p>
          <a 
            href="/" 
            className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            Go to Dashboard <ExternalLink className="w-3 h-3" />
          </a>
        </footer>
      </div>
    </div>
  );
}

function StepItem({ number, title, desc, link }: { number: string, title: string, desc: string, link?: string }) {
  return (
    <div className="flex gap-4 group">
      <div className="text-xs font-mono font-bold text-slate-600 group-hover:text-blue-500 transition-colors">{number}</div>
      <div>
        <h5 className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-2">
          {title}
          {link && (
            <a href={link} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </h5>
        <p className="text-[11px] text-slate-500 leading-normal">{desc}</p>
      </div>
    </div>
  );
}
