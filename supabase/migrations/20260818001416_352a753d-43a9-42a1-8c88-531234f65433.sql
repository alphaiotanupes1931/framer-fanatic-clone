CREATE OR REPLACE FUNCTION public.set_my_profile_kind(_kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _kind NOT IN ('artist','resident','visitor') THEN
    RAISE EXCEPTION 'Invalid profile kind: %', _kind;
  END IF;

  UPDATE public.profiles SET role = _kind WHERE id = uid;

  DELETE FROM public.user_roles
   WHERE user_id = uid AND role::text IN ('artist','resident','visitor');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, _kind::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_profile_kind(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_profile_kind(text) TO authenticated;