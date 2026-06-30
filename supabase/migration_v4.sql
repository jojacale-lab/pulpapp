-- PulpApp migration v4
-- 1. Agrega clinic_name a user_profiles
-- 2. Actualiza trigger handle_new_user para ambos dueños

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS clinic_name TEXT;

-- Trigger actualizado: ambos dueños → 'admin' + 'free', trial → 30 días
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE is_owner BOOLEAN;
BEGIN
  is_owner := NEW.email IN ('jojacale@gmail.com', 'sica2121@gmail.com');
  INSERT INTO public.user_profiles (id, email, full_name, role, subscription_status, subscription_end_date, clinic_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN is_owner THEN 'admin' ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'dentist') END,
    CASE WHEN is_owner THEN 'free' ELSE 'trial' END,
    CASE WHEN is_owner THEN NULL ELSE NOW() + INTERVAL '30 days' END,
    NEW.raw_user_meta_data->>'clinic_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
