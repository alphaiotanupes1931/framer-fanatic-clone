CREATE OR REPLACE FUNCTION public.can_view_org_post(_org uuid, _also_public boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN _org IS NULL OR COALESCE(_also_public, false) THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.organizations o WHERE o.id = _org AND (
        (o.type NOT IN ('group','community_assoc','community_association') AND COALESCE(o.is_public, true))
        OR o.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR public.is_org_member(o.id, auth.uid())
      ))
  END
$$;