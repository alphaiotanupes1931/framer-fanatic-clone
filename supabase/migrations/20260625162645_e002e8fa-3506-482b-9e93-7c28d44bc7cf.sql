CREATE OR REPLACE FUNCTION public.public_profile_by_username(_username text)
RETURNS TABLE(
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  banner_url text,
  bio text,
  neighborhood text,
  role text,
  category text,
  website text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.banner_url, p.bio, p.neighborhood, p.role, p.category, p.website
  FROM public.profiles p
  WHERE (lower(p.username) = lower(_username) OR p.id::text = _username)
    AND COALESCE(p.banned, false) = false
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.public_profile_by_username(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_profile_by_username(text) TO authenticated, service_role;