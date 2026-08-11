DROP POLICY "orgs artist or admin insert" ON public.organizations;
CREATE POLICY "orgs owner insert" ON public.organizations
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);