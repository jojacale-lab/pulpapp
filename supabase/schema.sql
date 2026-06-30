-- ============================================================
-- PulpApp - Dental Office Management System
-- Supabase Database Schema
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USER PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'dentist' CHECK (role IN ('admin', 'dentist', 'assistant')),
  phone TEXT,
  license_number TEXT,
  specialty TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('active', 'inactive', 'trial', 'free')),
  subscription_end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, subscription_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'dentist'),
    CASE WHEN NEW.email = 'jojacale@gmail.com' THEN 'free' ELSE 'trial' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PATIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_number TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('M', 'F', 'O')),
  national_id TEXT,
  address TEXT,
  city TEXT,
  insurance_provider TEXT,
  insurance_number TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  occupation TEXT,
  referred_by TEXT,
  blood_type TEXT CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','')),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  photo_url TEXT,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto patient number
CREATE OR REPLACE FUNCTION generate_patient_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(patient_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.patients
  WHERE patient_number LIKE 'PAC%';
  NEW.patient_number := 'PAC' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_patient_number
  BEFORE INSERT ON public.patients
  FOR EACH ROW
  WHEN (NEW.patient_number IS NULL)
  EXECUTE FUNCTION generate_patient_number();

-- ============================================================
-- MEDICAL HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medical_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE UNIQUE,
  -- Systemic conditions
  has_diabetes BOOLEAN DEFAULT false,
  has_hypertension BOOLEAN DEFAULT false,
  has_heart_disease BOOLEAN DEFAULT false,
  has_epilepsy BOOLEAN DEFAULT false,
  has_asthma BOOLEAN DEFAULT false,
  has_hepatitis BOOLEAN DEFAULT false,
  has_hiv BOOLEAN DEFAULT false,
  has_kidney_disease BOOLEAN DEFAULT false,
  has_thyroid_disease BOOLEAN DEFAULT false,
  has_coagulopathy BOOLEAN DEFAULT false,
  has_osteoporosis BOOLEAN DEFAULT false,
  other_conditions TEXT,
  -- Medications
  current_medications TEXT,
  anticoagulants TEXT,
  -- Allergies
  has_penicillin_allergy BOOLEAN DEFAULT false,
  has_aspirin_allergy BOOLEAN DEFAULT false,
  has_latex_allergy BOOLEAN DEFAULT false,
  has_anesthesia_allergy BOOLEAN DEFAULT false,
  has_ibuprofen_allergy BOOLEAN DEFAULT false,
  other_allergies TEXT,
  -- Dental history
  last_dental_visit DATE,
  previous_dental_issues TEXT,
  has_dental_anxiety BOOLEAN DEFAULT false,
  reason_for_anxiety TEXT,
  -- Habits
  smokes BOOLEAN DEFAULT false,
  cigarettes_per_day INTEGER,
  drinks_alcohol BOOLEAN DEFAULT false,
  alcohol_frequency TEXT,
  teeth_grinding BOOLEAN DEFAULT false,
  nail_biting BOOLEAN DEFAULT false,
  -- Women's health
  is_pregnant BOOLEAN DEFAULT false,
  pregnancy_weeks INTEGER,
  is_breastfeeding BOOLEAN DEFAULT false,
  -- Signature
  patient_signature TEXT,
  signed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLINICAL RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clinical_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  dentist_id UUID REFERENCES public.user_profiles(id),
  visit_date TIMESTAMPTZ DEFAULT NOW(),
  chief_complaint TEXT NOT NULL,
  intraoral_findings TEXT,
  extraoral_findings TEXT,
  diagnosis TEXT,
  treatment_performed TEXT,
  treatment_plan TEXT,
  medications_prescribed TEXT,
  next_visit_instructions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ODONTOGRAM
-- ============================================================
CREATE TABLE IF NOT EXISTS public.odontogram (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  tooth_number INTEGER NOT NULL CHECK (tooth_number BETWEEN 11 AND 48),
  -- Surface conditions (5 surfaces)
  surface_buccal TEXT DEFAULT 'healthy',
  surface_lingual TEXT DEFAULT 'healthy',
  surface_mesial TEXT DEFAULT 'healthy',
  surface_distal TEXT DEFAULT 'healthy',
  surface_occlusal TEXT DEFAULT 'healthy',
  -- Overall status
  status TEXT DEFAULT 'healthy' CHECK (status IN (
    'healthy', 'caries', 'filled', 'crown', 'extraction',
    'root_canal', 'bridge', 'implant', 'fracture', 'abscess',
    'missing', 'impacted', 'watch'
  )),
  notes TEXT,
  updated_by UUID REFERENCES public.user_profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, tooth_number)
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  dentist_id UUID REFERENCES public.user_profiles(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  treatment_type TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
  )),
  color TEXT DEFAULT '#1a9e75',
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TREATMENTS CATALOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.treatments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  default_price DECIMAL(10,2) DEFAULT 0,
  duration_minutes INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default treatments
INSERT INTO public.treatments (code, name, category, default_price, duration_minutes) VALUES
  ('CON001', 'Consulta general', 'Consulta', 50.00, 30),
  ('LIM001', 'Limpieza dental (profilaxis)', 'Preventivo', 80.00, 45),
  ('EXT001', 'Extracción simple', 'Cirugía', 100.00, 30),
  ('EXT002', 'Extracción quirúrgica', 'Cirugía', 200.00, 60),
  ('CAR001', 'Resina compuesta (1 superficie)', 'Restaurativo', 120.00, 45),
  ('CAR002', 'Resina compuesta (2 superficies)', 'Restaurativo', 150.00, 60),
  ('CAR003', 'Resina compuesta (3 superficies)', 'Restaurativo', 180.00, 75),
  ('END001', 'Endodoncia anterior', 'Endodoncia', 350.00, 90),
  ('END002', 'Endodoncia premolar', 'Endodoncia', 420.00, 90),
  ('END003', 'Endodoncia molar', 'Endodoncia', 500.00, 120),
  ('COR001', 'Corona metal-porcelana', 'Prótesis', 600.00, 120),
  ('COR002', 'Corona zirconio', 'Prótesis', 900.00, 120),
  ('ORT001', 'Ortodoncia (mes)', 'Ortodoncia', 150.00, 30),
  ('BLA001', 'Blanqueamiento dental', 'Estética', 250.00, 60),
  ('IMP001', 'Implante dental', 'Implantología', 1500.00, 120),
  ('RAD001', 'Radiografía periapical', 'Diagnóstico', 20.00, 15),
  ('RAD002', 'Radiografía panorámica', 'Diagnóstico', 60.00, 15)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT UNIQUE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  dentist_id UUID REFERENCES public.user_profiles(id),
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'partial')),
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer', 'insurance', '')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  year_str TEXT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.invoices
  WHERE invoice_number LIKE 'FAC-' || year_str || '-%';
  NEW.invoice_number := 'FAC-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

-- ============================================================
-- INVOICE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  treatment_id UUID REFERENCES public.treatments(id),
  description TEXT NOT NULL,
  tooth_number INTEGER,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odontogram ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can read own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Authenticated can read all profiles" ON public.user_profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage all profiles" ON public.user_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Patients: all authenticated can CRUD
CREATE POLICY "Authenticated users can view patients" ON public.patients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert patients" ON public.patients FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update patients" ON public.patients FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete patients" ON public.patients FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'dentist'))
);

-- Medical history
CREATE POLICY "Authenticated can manage medical history" ON public.medical_history FOR ALL USING (auth.role() = 'authenticated');

-- Clinical records
CREATE POLICY "Authenticated can view clinical records" ON public.clinical_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Dentists can manage clinical records" ON public.clinical_records FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'dentist'))
);

-- Odontogram
CREATE POLICY "Authenticated can manage odontogram" ON public.odontogram FOR ALL USING (auth.role() = 'authenticated');

-- Appointments
CREATE POLICY "Authenticated can manage appointments" ON public.appointments FOR ALL USING (auth.role() = 'authenticated');

-- Treatments
CREATE POLICY "Authenticated can view treatments" ON public.treatments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage treatments" ON public.treatments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Invoices
CREATE POLICY "Authenticated can manage invoices" ON public.invoices FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage invoice items" ON public.invoice_items FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_patients_national_id ON public.patients(national_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist ON public.appointments(dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_records_patient ON public.clinical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_odontogram_patient ON public.odontogram(patient_id);
