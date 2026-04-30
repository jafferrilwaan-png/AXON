-- AXON Database Full Schema
-- Clean Re-run Script

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Cleanup Existing Objects (Order matters for foreign keys)
DROP TRIGGER IF EXISTS update_patients_updated_at ON public.patients;
DROP TRIGGER IF EXISTS update_doctor_details_updated_at ON public.doctor_details;
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.medical_records CASCADE;
DROP TABLE IF EXISTS public.consents CASCADE;
DROP TABLE IF EXISTS public.doctor_details CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;

-- 3. Create updated_at logic helper
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Patients Table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  clinical_id VARCHAR(6) UNIQUE,
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

-- 5. Doctor Details Table
CREATE TABLE public.doctor_details (
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

-- 6. Medical Records Table
CREATE TABLE public.medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  title TEXT,
  document_type TEXT,
  date_detected DATE,
  summary TEXT,
  key_findings JSONB DEFAULT '[]'::jsonb,
  test_values JSONB DEFAULT '[]'::jsonb,
  risk_flags JSONB DEFAULT '[]'::jsonb,
  doctor_notes TEXT,
  follow_up JSONB DEFAULT '[]'::jsonb,
  is_processing BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Consents Table
CREATE TABLE public.consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  doctor_email TEXT,
  access_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'revoked', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Audit Logs Table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  ip_address TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Triggers
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_doctor_details_updated_at BEFORE UPDATE ON public.doctor_details FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 10. RLS Enabling
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 11. Policies
CREATE POLICY "Users manage their own AXON profile" ON public.patients FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Doctors can read patient profiles" ON public.patients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Everyone can view doctor profiles" ON public.doctor_details FOR SELECT USING (true);
CREATE POLICY "Doctors manage their own profile" ON public.doctor_details FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Patients manage their AXON records" ON public.medical_records FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);

CREATE POLICY "Patients manage AXON access codes" ON public.consents FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);

CREATE POLICY "Doctors can insert and request consents" ON public.consents FOR INSERT TO authenticated WITH CHECK (
    doctor_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Doctors can view their consents" ON public.consents FOR SELECT TO authenticated USING (
    doctor_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Doctors can update their consents" ON public.consents FOR UPDATE TO authenticated USING (
    doctor_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Patients insert their logs" ON public.audit_logs FOR INSERT WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);

CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);


CREATE POLICY "Patients view their logs" ON public.audit_logs FOR SELECT USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);

-- 12. Storage Setup
INSERT INTO storage.buckets (id, name, public) VALUES ('medical-reports', 'medical-reports', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-pictures', 'profile-pictures', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;

CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'medical-reports' OR bucket_id = 'profile-pictures'
);

CREATE POLICY "Users can view their own files" ON storage.objects FOR SELECT TO authenticated USING (
    bucket_id = 'medical-reports' AND owner = auth.uid()
);

CREATE POLICY "Anyone can view profile pictures" ON storage.objects FOR SELECT USING (
    bucket_id = 'profile-pictures'
);
