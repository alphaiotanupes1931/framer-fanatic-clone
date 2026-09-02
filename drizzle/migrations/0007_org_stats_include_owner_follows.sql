CREATE OR REPLACE FUNCTION public.public_org_stats(_type text DEFAULT NULL::text)
 RETURNS TABLE(org_id uuid, follower_count bigint, last_active_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT o.id,
         COALESCE(f.cnt, 0)::bigint,
         GREATEST(COALESCE(a.last_post, o.created_at), o.created_at)
  FROM public.organizations o
  LEFT JOIN LATERAL (
    SELECT count(DISTINCT uid)::bigint AS cnt FROM (
      SELECT ofw.user_id AS uid FROM public.organization_followers ofw WHERE ofw.organization_id = o.id
      UNION
      SELECT fl.follower_id AS uid FROM public.follows fl WHERE o.owner_id IS NOT NULL AND fl.following_id = o.owner_id
    ) u
  ) f ON true
  LEFT JOIN LATERAL (
    SELECT max(x.created_at) AS last_post FROM (
      SELECT op.created_at FROM public.organization_posts op WHERE op.org_id = o.id
      UNION ALL
      SELECT po.created_at FROM public.posts po
        WHERE po.organization_id = o.id AND COALESCE(po.is_deleted, false) = false
    ) x
  ) a ON true
  WHERE _type IS NULL OR o.type = _type;
$function$;

GRANT EXECUTE ON FUNCTION public.public_org_stats(text) TO anon, authenticated, service_role;