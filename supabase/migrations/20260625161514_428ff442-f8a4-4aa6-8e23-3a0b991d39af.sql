
CREATE OR REPLACE FUNCTION public.admin_delete_event(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.events WHERE id = _id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_profile(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM auth.users WHERE id = _id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_organization(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.organizations WHERE id = _id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_events()
RETURNS TABLE(id uuid, title text, starts_at timestamptz, user_id uuid, host_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.title, e.starts_at, e.user_id, p.display_name
  FROM public.events e LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY e.starts_at DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_organizations()
RETURNS TABLE(id uuid, name text, type text, slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.name, o.type, o.slug
  FROM public.organizations o
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY o.created_at DESC NULLS LAST;
$$;

DROP POLICY IF EXISTS "Public can read event images" ON storage.objects;
CREATE POLICY "Public can read event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');
