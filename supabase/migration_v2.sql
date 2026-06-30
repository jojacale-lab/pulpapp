-- ============================================================
-- MIGRACIÓN v2: Rediseño módulo evolución + historia médica
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================

-- 1. NUEVAS COLUMNAS EN evolutions (Curso de tratamiento)
ALTER TABLE public.evolutions
  ADD COLUMN IF NOT EXISTS tooth_number    TEXT,
  ADD COLUMN IF NOT EXISTS tooth_surface   TEXT,
  ADD COLUMN IF NOT EXISTS abono           NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo           NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS firma_url       TEXT;

-- 2. NUEVAS COLUMNAS EN medical_history (Ficha médica ampliada)
ALTER TABLE public.medical_history
  ADD COLUMN IF NOT EXISTS has_cardiovascular      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_gastritis           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_cholesterol         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_sinusitis           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_allergy_flag        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_other_antecedents   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_medicated            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS medications_which       TEXT,
  ADD COLUMN IF NOT EXISTS pregnancy_weeks         INTEGER,
  ADD COLUMN IF NOT EXISTS oral_hygiene_habits     TEXT,
  ADD COLUMN IF NOT EXISTS patient_observations    TEXT,
  ADD COLUMN IF NOT EXISTS health_habits_recommended TEXT;

-- 3. TABLA: plan de tratamiento por paciente
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id             UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id     UUID          NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tooth_number   TEXT,
  procedure      TEXT          NOT NULL,
  estimated_cost NUMERIC(12,2) DEFAULT 0,
  status         TEXT          NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'in_progress', 'done')),
  notes          TEXT,
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);

ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage treatment_plans"
  ON public.treatment_plans FOR ALL
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON public.treatment_plans(patient_id);

-- 4. TABLA: orden de medicamentos por paciente
CREATE TABLE IF NOT EXISTS public.medication_orders (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id  UUID        NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medication  TEXT        NOT NULL,
  formula     TEXT,
  frequency   TEXT,
  duration    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.medication_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage medication_orders"
  ON public.medication_orders FOR ALL
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_medication_orders_patient ON public.medication_orders(patient_id);
