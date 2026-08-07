CREATE OR REPLACE FUNCTION public.admin_set_founder(_user_id uuid, _is_founder boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_caller() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.profiles SET is_founder = _is_founder, updated_at = now() WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_founder(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_founder(uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_founder_visible(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.is_admin_caller()
    THEN COALESCE((SELECT is_founder FROM public.profiles WHERE id = _user_id), false)
    ELSE false END;
$$;

REVOKE ALL ON FUNCTION public.is_founder_visible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_founder_visible(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.public_profiles_by_ids(_ids uuid[])
RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, neighborhood text, is_founder boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.neighborhood,
         CASE WHEN public.is_admin_caller() THEN p.is_founder ELSE false END AS is_founder
  FROM public.profiles p
  WHERE p.id = ANY(_ids);
$$;

CREATE OR REPLACE FUNCTION public.top_creators(lim integer DEFAULT 12)
RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, category text, role text, score bigint, is_founder boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.category, p.role,
    (COALESCE(f.cnt,0) * 3 + COALESCE(po.cnt,0) + COALESCE(st.cnt,0))::bigint AS score,
    CASE WHEN public.is_admin_caller() THEN p.is_founder ELSE false END AS is_founder
  FROM public.profiles p
  LEFT JOIN (SELECT following_id AS uid, count(*) cnt FROM public.follows GROUP BY 1) f ON f.uid = p.id
  LEFT JOIN (SELECT user_id AS uid, count(*) cnt FROM public.posts WHERE is_deleted = false GROUP BY 1) po ON po.uid = p.id
  LEFT JOIN (SELECT user_id AS uid, count(*) cnt FROM public.stories WHERE status = 'published' GROUP BY 1) st ON st.uid = p.id
  WHERE p.banned = false AND p.hidden_from_showcase = false
  ORDER BY score DESC, p.created_at DESC
  LIMIT COALESCE(lim, 12);
$$;