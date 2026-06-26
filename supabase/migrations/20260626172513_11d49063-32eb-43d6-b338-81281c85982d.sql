CREATE OR REPLACE FUNCTION public.top_creators(lim integer DEFAULT 3)
RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, category text, role text, score bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH artist_profiles AS (
    SELECT p.id, p.display_name, p.username, p.avatar_url, p.category, p.role
    FROM public.profiles p
    WHERE COALESCE(p.banned,false)=false
      AND COALESCE(p.hidden_from_showcase,false)=false
      AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p.id AND ur.role='artist')
  ),
  post_engagement AS (
    SELECT user_id, SUM(COALESCE(likes_count,0) + COALESCE(comments_count,0))::bigint AS s
    FROM public.posts GROUP BY user_id
  ),
  follower_counts AS (
    SELECT following_id AS user_id, COUNT(*)::bigint AS s
    FROM public.follows GROUP BY following_id
  )
  SELECT ap.id, ap.display_name, ap.username, ap.avatar_url, ap.category, ap.role,
         (COALESCE(pe.s,0) + COALESCE(fc.s,0))::bigint AS score
  FROM artist_profiles ap
  LEFT JOIN post_engagement pe ON pe.user_id = ap.id
  LEFT JOIN follower_counts fc ON fc.user_id = ap.id
  ORDER BY score DESC, ap.id
  LIMIT GREATEST(1, LEAST(lim, 50));
$$;

GRANT EXECUTE ON FUNCTION public.top_creators(integer) TO anon, authenticated, service_role;