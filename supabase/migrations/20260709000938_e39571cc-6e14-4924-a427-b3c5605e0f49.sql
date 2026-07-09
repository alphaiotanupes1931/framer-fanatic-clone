
CREATE OR REPLACE FUNCTION public.is_admin_caller() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR COALESCE(auth.role(), '') = 'service_role';
$$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
 RETURNS TABLE(id uuid, email text, display_name text, username text, avatar_url text, role text, neighborhood text, in_baltimore boolean, banned boolean, hidden_from_showcase boolean, created_at timestamptz, last_seen_at timestamptz, is_admin boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.email, p.display_name, p.username, p.avatar_url, p.role,
         p.neighborhood, p.in_baltimore, p.banned, p.hidden_from_showcase,
         p.created_at, p.last_seen_at,
         EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin') AS is_admin
  FROM public.profiles p
  WHERE public.is_admin_caller()
  ORDER BY p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_events()
 RETURNS TABLE(id uuid, title text, starts_at timestamptz, user_id uuid, host_name text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.title, e.starts_at, e.user_id, p.display_name
  FROM public.events e LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE public.is_admin_caller()
  ORDER BY e.starts_at DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_organizations()
 RETURNS TABLE(id uuid, name text, type text, slug text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.name, o.type, o.slug
  FROM public.organizations o
  WHERE public.is_admin_caller()
  ORDER BY o.created_at DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_banned(_user_id uuid, _banned boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET banned = _banned, updated_at = now() WHERE id = _user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_showcase_hidden(_user_id uuid, _hidden boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET hidden_from_showcase = _hidden, updated_at = now() WHERE id = _user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_update_profile(_user_id uuid, _display_name text DEFAULT NULL, _username text DEFAULT NULL, _avatar_url text DEFAULT NULL, _bio text DEFAULT NULL, _neighborhood text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles
  SET display_name = COALESCE(_display_name, display_name),
      username     = COALESCE(_username, username),
      avatar_url   = COALESCE(_avatar_url, avatar_url),
      bio          = COALESCE(_bio, bio),
      neighborhood = COALESCE(_neighborhood, neighborhood),
      updated_at   = now()
  WHERE id = _user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_event(_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.events WHERE id = _id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_organization(_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.organizations WHERE id = _id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_profile(_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM auth.users WHERE id = _id;
END; $$;
