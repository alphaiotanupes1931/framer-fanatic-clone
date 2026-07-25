CREATE OR REPLACE FUNCTION public.public_artists(lim integer DEFAULT 96, search text DEFAULT NULL::text, sort_by text DEFAULT 'newest'::text)
 RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, role text, neighborhood text, bio text, in_baltimore boolean, category text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id,
         COALESCE(p.display_name, p.username) AS display_name,
         p.username, p.avatar_url, p.role,
         p.neighborhood, p.bio, p.in_baltimore, p.category, p.created_at
  FROM public.profiles p
  WHERE COALESCE(p.banned, false) = false
    AND COALESCE(p.hidden_from_showcase, false) = false
    AND COALESCE(p.display_name, p.username) IS NOT NULL
    AND LOWER(COALESCE(p.role, '')) NOT IN ('resident','visitor')
    AND LOWER(COALESCE(p.category, '')) NOT IN ('resident','visitor')
    AND (
      p.role = 'artist'
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p.id AND ur.role = 'artist'
      )
    )
    AND (
      search IS NULL OR search = '' OR
      p.display_name ILIKE '%' || search || '%' OR
      p.username     ILIKE '%' || search || '%' OR
      p.neighborhood ILIKE '%' || search || '%' OR
      p.bio          ILIKE '%' || search || '%'
    )
  ORDER BY
    CASE WHEN sort_by = 'newest' THEN p.created_at END DESC NULLS LAST,
    CASE WHEN sort_by <> 'newest' THEN COALESCE(p.display_name, p.username) END ASC NULLS LAST
  LIMIT GREATEST(1, LEAST(lim, 500));
$function$;