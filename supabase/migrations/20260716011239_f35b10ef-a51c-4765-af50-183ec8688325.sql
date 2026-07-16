
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  requested_role text := COALESCE(m->>'role','resident');
  ref uuid;
BEGIN
  BEGIN
    ref := NULLIF(m->>'referred_by','')::uuid;
  EXCEPTION WHEN others THEN
    ref := NULL;
  END;
  INSERT INTO public.profiles (id, email, display_name, role, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(m->>'display_name', m->>'full_name', split_part(NEW.email,'@',1)),
    CASE WHEN requested_role IN ('artist','resident','visitor') THEN requested_role ELSE 'resident' END,
    ref
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_referrer(_username text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT id FROM public.profiles
  WHERE lower(username) = lower(_username) AND COALESCE(banned,false)=false
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_referrer(text) TO anon, authenticated;
