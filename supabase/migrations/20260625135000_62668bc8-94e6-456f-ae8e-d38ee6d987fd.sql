
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  _user_id uuid,
  _display_name text DEFAULT NULL,
  _username text DEFAULT NULL,
  _avatar_url text DEFAULT NULL,
  _bio text DEFAULT NULL,
  _neighborhood text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.profiles
  SET display_name = COALESCE(_display_name, display_name),
      username     = COALESCE(_username, username),
      avatar_url   = COALESCE(_avatar_url, avatar_url),
      bio          = COALESCE(_bio, bio),
      neighborhood = COALESCE(_neighborhood, neighborhood),
      updated_at   = now()
  WHERE id = _user_id;
END;
$$;

-- Allow admins to manage any object in the avatars bucket
CREATE POLICY "Admins manage avatars"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));
