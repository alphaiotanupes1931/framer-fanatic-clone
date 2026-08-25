CREATE OR REPLACE FUNCTION public.admin_location_stats()
RETURNS TABLE(kind text, label text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'neighborhood'::text, COALESCE(NULLIF(btrim(p.neighborhood), ''), 'Unspecified')::text, count(*)::bigint
  FROM public.profiles p
  WHERE COALESCE(p.category, '') <> 'Visitor'
  GROUP BY 2
  UNION ALL
  SELECT 'visitor_city'::text, COALESCE(NULLIF(btrim(p.city), ''), 'Unspecified')::text, count(*)::bigint
  FROM public.profiles p
  WHERE COALESCE(p.category, '') = 'Visitor'
  GROUP BY 2
  UNION ALL
  SELECT 'audience'::text,
         CASE WHEN COALESCE(p.category, '') = 'Visitor' THEN 'Visitor' ELSE 'Resident' END::text,
         count(*)::bigint
  FROM public.profiles p
  GROUP BY 2
$$;

REVOKE ALL ON FUNCTION public.admin_location_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_location_stats() TO service_role;