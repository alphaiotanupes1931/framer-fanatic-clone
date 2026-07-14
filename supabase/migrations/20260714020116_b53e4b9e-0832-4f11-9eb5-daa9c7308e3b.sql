CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  requested_role text := COALESCE(m->>'role','attendee');
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(m->>'display_name', m->>'full_name', split_part(NEW.email,'@',1)),
    CASE WHEN requested_role IN ('artist','attendee','resident','visitor') THEN requested_role ELSE 'attendee' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;