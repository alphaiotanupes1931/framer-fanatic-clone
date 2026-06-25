ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hidden_from_showcase boolean NOT NULL DEFAULT false;

UPDATE public.profiles SET hidden_from_showcase = true
WHERE email IN ('tntdquad3737@gmail.com', 'terellebony@gmail.com', 'bob@gmail.com');

CREATE OR REPLACE FUNCTION public.public_creators(lim integer DEFAULT 50)
 RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, category text, role text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.category, p.role
  FROM public.profiles p
  WHERE COALESCE(p.banned, false) = false
    AND COALESCE(p.hidden_from_showcase, false) = false
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(lim, 200));
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_showcase_hidden(_user_id uuid, _hidden boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET hidden_from_showcase = _hidden, updated_at = now() WHERE id = _user_id;
END;
$function$;

DROP FUNCTION IF EXISTS public.admin_list_users();
CREATE OR REPLACE FUNCTION public.admin_list_users()
 RETURNS TABLE(id uuid, email text, display_name text, username text, avatar_url text, role text, neighborhood text, in_baltimore boolean, banned boolean, hidden_from_showcase boolean, created_at timestamp with time zone, last_seen_at timestamp with time zone, is_admin boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.id, p.email, p.display_name, p.username, p.avatar_url, p.role,
         p.neighborhood, p.in_baltimore, p.banned, p.hidden_from_showcase,
         p.created_at, p.last_seen_at,
         EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin') AS is_admin
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC;
$function$;