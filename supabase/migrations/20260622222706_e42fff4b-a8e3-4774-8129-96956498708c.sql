
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'attendee' CHECK (role IN ('artist','attendee')),
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS in_baltimore boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  lat double precision := NULLIF(m->>'latitude','')::double precision;
  lng double precision := NULLIF(m->>'longitude','')::double precision;
  in_balt boolean := false;
  requested_role text := COALESCE(m->>'role','attendee');
  final_role text;
BEGIN
  IF lat IS NOT NULL AND lng IS NOT NULL THEN
    in_balt := lat BETWEEN 39.20 AND 39.38 AND lng BETWEEN -76.72 AND -76.52;
  END IF;
  final_role := CASE WHEN requested_role = 'artist' AND in_balt THEN 'artist' ELSE 'attendee' END;

  INSERT INTO public.profiles (id, email, display_name, role, latitude, longitude, in_baltimore)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(m->>'display_name', m->>'full_name', split_part(NEW.email,'@',1)),
    final_role,
    lat,
    lng,
    in_balt
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
