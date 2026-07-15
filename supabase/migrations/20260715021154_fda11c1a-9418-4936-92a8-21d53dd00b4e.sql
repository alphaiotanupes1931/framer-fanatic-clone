
CREATE OR REPLACE FUNCTION public.get_actors_minimal(_ids uuid[])
RETURNS TABLE (id uuid, display_name text, username text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(_ids);
$$;

REVOKE ALL ON FUNCTION public.get_actors_minimal(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_actors_minimal(uuid[]) TO authenticated;
