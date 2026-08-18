UPDATE public.profiles SET is_founder = false WHERE is_founder = true;

CREATE OR REPLACE FUNCTION public.public_profiles_by_ids(_ids uuid[])
 RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, neighborhood text, is_founder boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.neighborhood,
         CASE WHEN public.is_admin_caller() THEN COALESCE(p.is_founder,false) ELSE false END
  FROM public.profiles p
  WHERE p.id = ANY(_ids) AND COALESCE(p.banned,false)=false;
$function$;