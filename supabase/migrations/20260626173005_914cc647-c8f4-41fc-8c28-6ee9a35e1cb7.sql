DROP FUNCTION IF EXISTS public.public_profiles_by_ids(uuid[]);
CREATE FUNCTION public.public_profiles_by_ids(_ids uuid[])
RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, neighborhood text, is_founder boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.neighborhood, COALESCE(p.is_founder,false)
  FROM public.profiles p
  WHERE p.id = ANY(_ids) AND COALESCE(p.banned,false)=false;
$$;
GRANT EXECUTE ON FUNCTION public.public_profiles_by_ids(uuid[]) TO anon, authenticated, service_role;