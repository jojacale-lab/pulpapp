-- ============================================================
--  PulpApp — Schema completo desde cero
--  Versión: 2.1 (DROP POLICY IF EXISTS antes de cada política)
--
--  INSTRUCCIONES:
--  1. Abre Supabase → SQL Editor
--  2. Pega TODO este archivo y ejecuta con "Run"
--  3. Después ve a Storage y crea el bucket "evolution-photos"
--     (público, para fotos clínicas de evoluciones)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USER PROFILES  (extiende auth.users de Supabase)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id                    UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email                 TEXT        NOT NULL UNIQUE,
  full_name             TEXT        NOT NULL,
  role                  TEXT        NOT NULL DEFAULT 'dentist'
                                    CHECK (role IN ('admin','dentist','assistant')),
  phone                 TEXT,
  license_number        TEXT,
  specialty             TEXT,
  avatar_url            TEXT,
  is_active             BOOLEAN     DEFAULT true,
  subscription_status   TEXT        DEFAULT 'trial'
                                    CHECK (subscription_status IN ('active','inactive','trial','free')),
  subscription_end_date TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: crea perfil automáticamente al registrar usuario en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, subscription_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'dentist'),
    CASE WHEN NEW.email = 'jojacale@gmail.com' THEN 'free' ELSE 'trial' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. PATIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.patients (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_number          TEXT        UNIQUE,
  first_name              TEXT        NOT NULL,
  last_name               TEXT        NOT NULL,
  email                   TEXT,
  phone                   TEXT,
  mobile                  TEXT,
  date_of_birth           DATE,
  gender                  TEXT        CHECK (gender IN ('M','F','O')),
  national_id             TEXT,
  address                 TEXT,
  city                    TEXT,
  insurance_provider      TEXT,
  insurance_number        TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  occupation              TEXT,
  referred_by             TEXT,
  blood_type              TEXT        CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','')),
  notes                   TEXT,
  is_active               BOOLEAN     DEFAULT true,
  photo_url               TEXT,
  created_by              UUID        REFERENCES public.user_profiles(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_patient_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(patient_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_num FROM public.patients WHERE patient_number LIKE 'PAC%';
  NEW.patient_number := 'PAC' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_patient_number ON public.patients;
CREATE TRIGGER set_patient_number
  BEFORE INSERT ON public.patients
  FOR EACH ROW WHEN (NEW.patient_number IS NULL)
  EXECUTE FUNCTION generate_patient_number();

-- ============================================================
-- 3. MEDICAL HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medical_history (
  id                        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id                UUID        REFERENCES public.patients(id) ON DELETE CASCADE UNIQUE,

  -- Antecedentes (formulario físico — 12 checkboxes)
  has_cardiovascular        BOOLEAN     DEFAULT false,
  has_coagulopathy          BOOLEAN     DEFAULT false,
  has_hypertension          BOOLEAN     DEFAULT false,
  has_hepatitis             BOOLEAN     DEFAULT false,
  has_diabetes              BOOLEAN     DEFAULT false,
  has_epilepsy              BOOLEAN     DEFAULT false,
  has_gastritis             BOOLEAN     DEFAULT false,
  has_asthma                BOOLEAN     DEFAULT false,
  has_cholesterol           BOOLEAN     DEFAULT false,
  has_allergy_flag          BOOLEAN     DEFAULT false,
  has_sinusitis             BOOLEAN     DEFAULT false,
  has_other_antecedents     BOOLEAN     DEFAULT false,

  -- Otras condiciones sistémicas
  has_heart_disease         BOOLEAN     DEFAULT false,
  has_hiv                   BOOLEAN     DEFAULT false,
  has_kidney_disease        BOOLEAN     DEFAULT false,
  has_thyroid_disease       BOOLEAN     DEFAULT false,
  has_osteoporosis          BOOLEAN     DEFAULT false,
  other_conditions          TEXT,

  -- Medicación actual
  is_medicated              BOOLEAN     DEFAULT false,
  medications_which         TEXT,
  current_medications       TEXT,
  anticoagulants            TEXT,

  -- Alergias específicas
  has_penicillin_allergy    BOOLEAN     DEFAULT false,
  has_aspirin_allergy       BOOLEAN     DEFAULT false,
  has_latex_allergy         BOOLEAN     DEFAULT false,
  has_anesthesia_allergy    BOOLEAN     DEFAULT false,
  has_ibuprofen_allergy     BOOLEAN     DEFAULT false,
  other_allergies           TEXT,

  -- Embarazo
  is_pregnant               BOOLEAN     DEFAULT false,
  pregnancy_weeks           INTEGER,
  is_breastfeeding          BOOLEAN     DEFAULT false,

  -- Higiene oral y observaciones
  oral_hygiene_habits       TEXT,
  patient_observations      TEXT,
  health_habits_recommended TEXT,

  -- Hábitos
  smokes                    BOOLEAN     DEFAULT false,
  cigarettes_per_day        INTEGER,
  drinks_alcohol            BOOLEAN     DEFAULT false,
  alcohol_frequency         TEXT,
  teeth_grinding            BOOLEAN     DEFAULT false,
  nail_biting               BOOLEAN     DEFAULT false,
  has_dental_anxiety        BOOLEAN     DEFAULT false,
  reason_for_anxiety        TEXT,

  -- Historial dental
  last_dental_visit         DATE,
  previous_dental_issues    TEXT,

  -- Firma de consentimiento
  patient_signature         TEXT,
  signed_at                 TIMESTAMPTZ,

  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. CLINICAL RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clinical_records (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id              UUID        REFERENCES public.patients(id) ON DELETE CASCADE,
  dentist_id              UUID        REFERENCES public.user_profiles(id),
  visit_date              TIMESTAMPTZ DEFAULT NOW(),
  chief_complaint         TEXT        NOT NULL,
  intraoral_findings      TEXT,
  extraoral_findings      TEXT,
  diagnosis               TEXT,
  treatment_performed     TEXT,
  treatment_plan          TEXT,
  medications_prescribed  TEXT,
  next_visit_instructions TEXT,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. ODONTOGRAM  (adulto 11-48 + pediátrico 51-85)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.odontogram (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id       UUID    REFERENCES public.patients(id) ON DELETE CASCADE,
  tooth_number     INTEGER NOT NULL
                   CHECK (
                     (tooth_number BETWEEN 11 AND 48) OR
                     (tooth_number BETWEEN 51 AND 55) OR
                     (tooth_number BETWEEN 61 AND 65) OR
                     (tooth_number BETWEEN 71 AND 75) OR
                     (tooth_number BETWEEN 81 AND 85)
                   ),
  surface_buccal   TEXT    DEFAULT 'healthy',
  surface_lingual  TEXT    DEFAULT 'healthy',
  surface_mesial   TEXT    DEFAULT 'healthy',
  surface_distal   TEXT    DEFAULT 'healthy',
  surface_occlusal TEXT    DEFAULT 'healthy',
  status           TEXT    DEFAULT 'healthy'
                   CHECK (status IN (
                     'healthy','caries','filled','crown','extraction',
                     'root_canal','bridge','implant','fracture','abscess',
                     'missing','impacted','watch'
                   )),
  notes            TEXT,
  updated_by       UUID    REFERENCES public.user_profiles(id),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (patient_id, tooth_number)
);

-- ============================================================
-- 6. APPOINTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id     UUID        REFERENCES public.patients(id) ON DELETE CASCADE,
  dentist_id     UUID        REFERENCES public.user_profiles(id),
  start_time     TIMESTAMPTZ NOT NULL,
  end_time       TIMESTAMPTZ NOT NULL,
  title          TEXT        NOT NULL,
  treatment_type TEXT,
  status         TEXT        DEFAULT 'scheduled'
                 CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  color          TEXT        DEFAULT '#1a9e75',
  notes          TEXT,
  reminder_sent  BOOLEAN     DEFAULT false,
  created_by     UUID        REFERENCES public.user_profiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. TREATMENTS CATALOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.treatments (
  id               UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  code             TEXT          UNIQUE,
  name             TEXT          NOT NULL,
  description      TEXT,
  category         TEXT,
  default_price    DECIMAL(10,2) DEFAULT 0,
  duration_minutes INTEGER       DEFAULT 30,
  is_active        BOOLEAN       DEFAULT true,
  created_at       TIMESTAMPTZ   DEFAULT NOW()
);

INSERT INTO public.treatments (code, name, category, default_price, duration_minutes) VALUES
  ('CON001','Consulta general',                 'Consulta',       50.00,  30),
  ('LIM001','Limpieza dental (profilaxis)',      'Preventivo',     80.00,  45),
  ('EXT001','Extracción simple',                'Cirugía',       100.00,  30),
  ('EXT002','Extracción quirúrgica',            'Cirugía',       200.00,  60),
  ('CAR001','Resina compuesta (1 superficie)',  'Restaurativo',  120.00,  45),
  ('CAR002','Resina compuesta (2 superficies)', 'Restaurativo',  150.00,  60),
  ('CAR003','Resina compuesta (3 superficies)', 'Restaurativo',  180.00,  75),
  ('END001','Endodoncia anterior',              'Endodoncia',    350.00,  90),
  ('END002','Endodoncia premolar',              'Endodoncia',    420.00,  90),
  ('END003','Endodoncia molar',                 'Endodoncia',    500.00, 120),
  ('COR001','Corona metal-porcelana',           'Prótesis',      600.00, 120),
  ('COR002','Corona zirconio',                  'Prótesis',      900.00, 120),
  ('ORT001','Ortodoncia (mes)',                 'Ortodoncia',    150.00,  30),
  ('BLA001','Blanqueamiento dental',            'Estética',      250.00,  60),
  ('IMP001','Implante dental',                  'Implantología',1500.00, 120),
  ('RAD001','Radiografía periapical',           'Diagnóstico',    20.00,  15),
  ('RAD002','Radiografía panorámica',           'Diagnóstico',    60.00,  15)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 8. INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id             UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT          UNIQUE,
  patient_id     UUID          REFERENCES public.patients(id) ON DELETE CASCADE,
  dentist_id     UUID          REFERENCES public.user_profiles(id),
  issue_date     DATE          DEFAULT CURRENT_DATE,
  due_date       DATE,
  status         TEXT          DEFAULT 'pending'
                 CHECK (status IN ('pending','paid','cancelled','partial')),
  subtotal       DECIMAL(10,2) DEFAULT 0,
  tax_rate       DECIMAL(5,2)  DEFAULT 0,
  tax_amount     DECIMAL(10,2) DEFAULT 0,
  discount       DECIMAL(10,2) DEFAULT 0,
  total          DECIMAL(10,2) DEFAULT 0,
  paid_amount    DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT          CHECK (payment_method IN ('cash','card','transfer','insurance','')),
  notes          TEXT,
  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE next_num INTEGER; year_str TEXT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_num FROM public.invoices
   WHERE invoice_number LIKE 'FAC-' || year_str || '-%';
  NEW.invoice_number := 'FAC-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_invoice_number ON public.invoices;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

-- ============================================================
-- 9. INVOICE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id           UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id   UUID          REFERENCES public.invoices(id) ON DELETE CASCADE,
  treatment_id UUID          REFERENCES public.treatments(id),
  description  TEXT          NOT NULL,
  tooth_number INTEGER,
  quantity     INTEGER       DEFAULT 1,
  unit_price   DECIMAL(10,2) NOT NULL,
  discount     DECIMAL(10,2) DEFAULT 0,
  total        DECIMAL(10,2) NOT NULL
);

-- ============================================================
-- 10. EVOLUTIONS  (Curso de tratamiento — bitácora)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evolutions (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id            UUID          NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  dentist_id            UUID          REFERENCES public.user_profiles(id),
  visit_date            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  tooth_number          TEXT,
  tooth_surface         TEXT,
  procedure_performed   TEXT          NOT NULL,
  abono                 NUMERIC(12,2) DEFAULT 0,
  saldo                 NUMERIC(12,2) DEFAULT 0,
  firma_url             TEXT,
  clinical_observations TEXT,
  materials_used        TEXT,
  next_appointment_plan TEXT,
  photo_url             TEXT,
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_evolutions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS evolutions_updated_at ON public.evolutions;
CREATE TRIGGER evolutions_updated_at
  BEFORE UPDATE ON public.evolutions
  FOR EACH ROW EXECUTE FUNCTION update_evolutions_updated_at();

-- ============================================================
-- 11. TREATMENT PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id             UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id     UUID          NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tooth_number   TEXT,
  procedure      TEXT          NOT NULL,
  estimated_cost NUMERIC(12,2) DEFAULT 0,
  status         TEXT          NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','in_progress','done')),
  notes          TEXT,
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);

-- ============================================================
-- 12. MEDICATION ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medication_orders (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id  UUID        NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medication  TEXT        NOT NULL,
  formula     TEXT,
  frequency   TEXT,
  duration    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY — habilitar en todas las tablas
-- ============================================================
ALTER TABLE public.user_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odontogram        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolutions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_orders ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS RLS  (DROP primero para evitar error si ya existen)
-- ============================================================

-- user_profiles
DROP POLICY IF EXISTS "Authenticated can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile"        ON public.user_profiles;
DROP POLICY IF EXISTS "Admins manage all profiles"          ON public.user_profiles;

CREATE POLICY "Authenticated can read all profiles"
  ON public.user_profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins manage all profiles"
  ON public.user_profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- patients
DROP POLICY IF EXISTS "Authenticated view patients"   ON public.patients;
DROP POLICY IF EXISTS "Authenticated insert patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated update patients" ON public.patients;
DROP POLICY IF EXISTS "Dentists delete patients"      ON public.patients;

CREATE POLICY "Authenticated view patients"
  ON public.patients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert patients"
  ON public.patients FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update patients"
  ON public.patients FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Dentists delete patients"
  ON public.patients FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','dentist'))
  );

-- medical_history
DROP POLICY IF EXISTS "Authenticated manage medical_history" ON public.medical_history;

CREATE POLICY "Authenticated manage medical_history"
  ON public.medical_history FOR ALL USING (auth.role() = 'authenticated');

-- clinical_records
DROP POLICY IF EXISTS "Authenticated view clinical_records" ON public.clinical_records;
DROP POLICY IF EXISTS "Dentists manage clinical_records"    ON public.clinical_records;

CREATE POLICY "Authenticated view clinical_records"
  ON public.clinical_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Dentists manage clinical_records"
  ON public.clinical_records FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','dentist'))
  );

-- odontogram
DROP POLICY IF EXISTS "Authenticated manage odontogram" ON public.odontogram;

CREATE POLICY "Authenticated manage odontogram"
  ON public.odontogram FOR ALL USING (auth.role() = 'authenticated');

-- appointments
DROP POLICY IF EXISTS "Authenticated manage appointments" ON public.appointments;

CREATE POLICY "Authenticated manage appointments"
  ON public.appointments FOR ALL USING (auth.role() = 'authenticated');

-- treatments
DROP POLICY IF EXISTS "Authenticated view treatments" ON public.treatments;
DROP POLICY IF EXISTS "Admins manage treatments"      ON public.treatments;

CREATE POLICY "Authenticated view treatments"
  ON public.treatments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage treatments"
  ON public.treatments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- invoices
DROP POLICY IF EXISTS "Authenticated manage invoices"      ON public.invoices;
DROP POLICY IF EXISTS "Authenticated manage invoice_items" ON public.invoice_items;

CREATE POLICY "Authenticated manage invoices"
  ON public.invoices FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated manage invoice_items"
  ON public.invoice_items FOR ALL USING (auth.role() = 'authenticated');

-- evolutions
DROP POLICY IF EXISTS "Authenticated manage evolutions" ON public.evolutions;

CREATE POLICY "Authenticated manage evolutions"
  ON public.evolutions FOR ALL USING (auth.role() = 'authenticated');

-- treatment_plans
DROP POLICY IF EXISTS "Authenticated manage treatment_plans" ON public.treatment_plans;

CREATE POLICY "Authenticated manage treatment_plans"
  ON public.treatment_plans FOR ALL USING (auth.role() = 'authenticated');

-- medication_orders
DROP POLICY IF EXISTS "Authenticated manage medication_orders" ON public.medication_orders;

CREATE POLICY "Authenticated manage medication_orders"
  ON public.medication_orders FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_patients_name              ON public.patients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_patients_national_id       ON public.patients(national_id);
CREATE INDEX IF NOT EXISTS idx_patients_active            ON public.patients(is_active);
CREATE INDEX IF NOT EXISTS idx_appointments_date          ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist       ON public.appointments(dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient       ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_patient           ON public.clinical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_date              ON public.clinical_records(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_odontogram_patient         ON public.odontogram(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient           ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status            ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice      ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_evolutions_patient         ON public.evolutions(patient_id);
CREATE INDEX IF NOT EXISTS idx_evolutions_date            ON public.evolutions(visit_date ASC);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient    ON public.treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_orders_patient  ON public.medication_orders(patient_id);

-- ============================================================
-- STORAGE BUCKET  evolution-photos
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('evolution-photos', 'evolution-photos', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated upload evolution photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read evolution photos"          ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete evolution photos" ON storage.objects;

CREATE POLICY "Authenticated upload evolution photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'evolution-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Public read evolution photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'evolution-photos');

CREATE POLICY "Authenticated delete evolution photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'evolution-photos' AND auth.role() = 'authenticated');

-- ============================================================
-- FIN DEL SCHEMA — PulpApp v2.1
-- ============================================================
