
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS access_code_hash text;

CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org AND user_id = _uid AND status = 'approved'
  )
$$;

DROP POLICY IF EXISTS "orgs read all" ON public.organizations;
DROP POLICY IF EXISTS hide_private_organizations ON public.organizations;

CREATE POLICY hide_private_organizations ON public.organizations
FOR SELECT
USING (
  is_public = true
  OR owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_org_member(id, auth.uid())
);

GRANT SELECT ON public.organizations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
