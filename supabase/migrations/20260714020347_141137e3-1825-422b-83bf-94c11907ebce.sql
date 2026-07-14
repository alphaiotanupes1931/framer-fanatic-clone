
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('artist','resident','visitor','admin','attendee'));

UPDATE public.profiles SET role = 'resident' WHERE role = 'attendee';
UPDATE public.user_roles SET role = 'resident' WHERE role = 'attendee';

CREATE OR REPLACE FUNCTION public.assign_default_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'resident')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  requested_role text := COALESCE(m->>'role','resident');
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(m->>'display_name', m->>'full_name', split_part(NEW.email,'@',1)),
    CASE WHEN requested_role IN ('artist','resident','visitor') THEN requested_role ELSE 'resident' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
