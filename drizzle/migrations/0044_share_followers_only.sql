CREATE OR REPLACE FUNCTION public.search_my_connections(_q text DEFAULT NULL::text, _cursor text DEFAULT NULL::text, _limit integer DEFAULT 25)
 RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, sort_key text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH me AS (SELECT auth.uid() AS uid),
  conn AS (
    SELECT f.follower_id AS uid FROM public.follows f, me WHERE f.following_id = me.uid
  ),
  rows AS (
    SELECT p.id, p.display_name, p.username, p.avatar_url,
           lower(coalesce(nullif(p.display_name, ''), p.username, '')) || '|' || p.id::text AS sort_key
    FROM public.profiles p
    JOIN conn c ON c.uid = p.id, me
    WHERE p.id <> me.uid
      AND coalesce(p.banned, false) = false
      AND (_q IS NULL OR btrim(_q) = ''
        OR p.display_name ILIKE '%' || btrim(_q) || '%'
        OR p.username ILIKE '%' || btrim(_q) || '%')
  )
  SELECT id, display_name, username, avatar_url, sort_key FROM rows
  WHERE _cursor IS NULL OR sort_key > _cursor
  ORDER BY sort_key
  LIMIT greatest(1, least(coalesce(_limit, 25), 100));
$function$;

CREATE OR REPLACE FUNCTION public.validate_share_recipients(_ids uuid[])
 RETURNS TABLE(id uuid, display_name text, username text, status text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select t.id, p.display_name, p.username,
    case
      when p.id is null then 'missing'
      when coalesce(p.banned, false) then 'deactivated'
      when not exists (
        select 1 from public.follows f
        where f.follower_id = t.id and f.following_id = auth.uid()
      ) then 'blocked'
      else 'ok'
    end as status
  from unnest(coalesce(_ids, '{}'::uuid[])) as t(id)
  left join public.profiles p on p.id = t.id
$function$;