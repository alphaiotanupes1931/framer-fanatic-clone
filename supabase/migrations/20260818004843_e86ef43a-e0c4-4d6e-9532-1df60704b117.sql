DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE OR REPLACE FUNCTION public.admin_list_users()
 RETURNS TABLE(id uuid, email text, display_name text, username text, avatar_url text, role text, neighborhood text, in_baltimore boolean, banned boolean, hidden_from_showcase boolean, created_at timestamp with time zone, last_seen_at timestamp with time zone, is_admin boolean, is_founder boolean, email_confirmed_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.email, p.display_name, p.username, p.avatar_url, p.role,
         p.neighborhood, p.in_baltimore, p.banned, p.hidden_from_showcase,
         p.created_at, p.last_seen_at,
         EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin') AS is_admin,
         COALESCE(p.is_founder, false) AS is_founder,
         au.email_confirmed_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  WHERE public.is_admin_caller()
  ORDER BY p.created_at DESC;
$function$;