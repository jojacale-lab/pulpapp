-- PulpApp migration v3
-- Agrega: motivo_consulta en medical_history, phase en treatment_plans

ALTER TABLE public.medical_history
  ADD COLUMN IF NOT EXISTS motivo_consulta TEXT;

ALTER TABLE public.treatment_plans
  ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'operatoria'
    CHECK (phase IN ('higienica', 'operatoria'));
