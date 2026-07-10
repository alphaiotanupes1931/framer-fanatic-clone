
-- 1) Backfill missing usernames from display_name/email for existing users
UPDATE public.profiles p
SET username = public.generate_unique_username(
  COALESCE(NULLIF(btrim(p.display_name), ''), split_part(COALESCE(p.email,''), '@', 1), 'user'),
  p.id
)
WHERE p.username IS NULL OR length(btrim(p.username)) = 0;

-- 2) RPC to search all (non-banned) users by real name or username, for @mention/exclude pickers
CREATE OR REPLACE FUNCTION public.search_all_users(q text DEFAULT '', lim integer DEFAULT 10)
RETURNS TABLE(id uuid, display_name text, username text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id,
         COALESCE(p.display_name, p.username) AS display_name,
         p.username,
         p.avatar_url
  FROM public.profiles p
  WHERE COALESCE(p.banned, false) = false
    AND COALESCE(p.username, '') <> ''
    AND (
      COALESCE(q,'') = ''
      OR p.display_name ILIKE '%' || q || '%'
      OR p.username     ILIKE '%' || q || '%'
    )
  ORDER BY
    CASE WHEN p.display_name ILIKE q || '%' OR p.username ILIKE q || '%' THEN 0 ELSE 1 END,
    COALESCE(p.display_name, p.username) ASC
  LIMIT GREATEST(1, LEAST(lim, 25));
$$;

GRANT EXECUTE ON FUNCTION public.search_all_users(text, integer) TO authenticated, anon;
