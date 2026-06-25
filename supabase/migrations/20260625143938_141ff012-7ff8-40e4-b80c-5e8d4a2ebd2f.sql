CREATE OR REPLACE FUNCTION public.public_creators(lim integer DEFAULT 50)
 RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, category text, role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.category, p.role
  FROM public.profiles p
  WHERE COALESCE(p.banned, false) = false
    AND COALESCE(p.email, '') NOT IN ('tntdquad3737@gmail.com', 'terellebony@gmail.com')
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(lim, 200));
$function$;