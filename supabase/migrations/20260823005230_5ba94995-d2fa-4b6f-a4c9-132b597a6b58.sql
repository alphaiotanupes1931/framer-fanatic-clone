CREATE OR REPLACE FUNCTION public.search_my_connections(_q text DEFAULT NULL, _cursor text DEFAULT NULL, _limit integer DEFAULT 25)
RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, sort_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  conn AS (
    SELECT f.follower_id AS uid FROM public.follows f, me WHERE f.following_id = me.uid
    UNION
    SELECT f.following_id AS uid FROM public.follows f, me WHERE f.follower_id = me.uid
  ),
  rows AS (
    SELECT p.id, p.display_name, p.username, p.avatar_url,
           lower(coalesce(nullif(p.display_name, ''), p.username, '')) || '|' || p.id::text AS sort_key
    FROM public.profiles p
    JOIN conn c ON c.uid = p.id, me
    WHERE p.id <> me.uid
      AND coalesce(p.banned, false) = false
      AND (
        _q IS NULL OR btrim(_q) = ''
        OR p.display_name ILIKE '%' || btrim(_q) || '%'
        OR p.username ILIKE '%' || btrim(_q) || '%'
      )
  )
  SELECT id, display_name, username, avatar_url, sort_key
  FROM rows
  WHERE _cursor IS NULL OR sort_key > _cursor
  ORDER BY sort_key
  LIMIT greatest(1, least(coalesce(_limit, 25), 100));
$$;

REVOKE ALL ON FUNCTION public.search_my_connections(text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_my_connections(text, text, integer) TO authenticated;