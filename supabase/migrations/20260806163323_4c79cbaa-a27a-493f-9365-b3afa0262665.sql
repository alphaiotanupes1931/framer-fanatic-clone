ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_type_check;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_type_check
  CHECK (type = ANY (ARRAY['arts_org'::text,'business'::text,'community_assoc'::text,'group'::text,'artist'::text]));

DROP POLICY IF EXISTS "orgs artist or admin insert" ON public.organizations;
CREATE POLICY "orgs owner insert" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);