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
    SELECT count(*)::bigint AS cnt FROM public.organization_followers ofw WHERE ofw.organization_id = o.id
  ) f ON true
  LEFT JOIN LATERAL (
    SELECT max(op.created_at) AS last_post FROM public.organization_posts op WHERE op.org_id = o.id
  ) a ON true
  WHERE _type IS NULL OR o.type = _type;
$function$;

GRANT EXECUTE ON FUNCTION public.public_org_stats(text) TO anon, authenticated, service_role;