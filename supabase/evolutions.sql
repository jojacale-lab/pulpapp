-- Módulo de Evolución Clínica
-- Ejecutar en: Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS public.evolutions (
  id                   UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id           UUID         NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  dentist_id           UUID         REFERENCES public.user_profiles(id),
  visit_date           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  procedure_performed  TEXT         NOT NULL,
  clinical_observations TEXT,
  materials_used       TEXT,
  next_appointment_plan TEXT,
  photo_url            TEXT,
  created_at           TIMESTAMPTZ  DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE public.evolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage evolutions"
  ON public.evolutions FOR ALL
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_evolutions_patient ON public.evolutions(patient_id);
CREATE INDEX IF NOT EXISTS idx_evolutions_date    ON public.evolutions(visit_date DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_evolutions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER evolutions_updated_at
  BEFORE UPDATE ON public.evolutions
  FOR EACH ROW EXECUTE FUNCTION update_evolutions_updated_at();
