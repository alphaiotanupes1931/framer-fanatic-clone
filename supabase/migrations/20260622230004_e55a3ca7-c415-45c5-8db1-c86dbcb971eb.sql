
CREATE OR REPLACE FUNCTION public.search_creators(q text DEFAULT '', lim int DEFAULT 24)
RETURNS TABLE (
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  role text,
  neighborhood text,
  bio text,
  in_baltimore boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.role, p.neighborhood, p.bio, p.in_baltimore
  FROM public.profiles p
  WHERE p.role = 'artist'
    AND (
      coalesce(q,'') = ''
      OR p.display_name ILIKE '%'||q||'%'
      OR p.username     ILIKE '%'||q||'%'
      OR p.neighborhood ILIKE '%'||q||'%'
      OR p.bio          ILIKE '%'||q||'%'
    )
  ORDER BY p.display_name NULLS LAST
  LIMIT GREATEST(1, LEAST(lim, 100));
$$;

REVOKE ALL ON FUNCTION public.search_creators(text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.search_creators(text, int) TO anon, authenticated;
