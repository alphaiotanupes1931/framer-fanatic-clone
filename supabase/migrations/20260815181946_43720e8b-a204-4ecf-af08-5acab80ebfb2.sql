DROP POLICY IF EXISTS "Owners can insert releases" ON public.organization_releases;
CREATE POLICY "Owners can insert releases" ON public.organization_releases FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.is_admin_caller());

DROP POLICY IF EXISTS "Owners can update releases" ON public.organization_releases;
CREATE POLICY "Owners can update releases" ON public.organization_releases FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.is_admin_caller())
WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.is_admin_caller());

DROP POLICY IF EXISTS "Owners can delete releases" ON public.organization_releases;
CREATE POLICY "Owners can delete releases" ON public.organization_releases FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.is_admin_caller());

DROP POLICY IF EXISTS "Owners can insert tracks" ON public.organization_tracks;
CREATE POLICY "Owners can insert tracks" ON public.organization_tracks FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.is_admin_caller());

DROP POLICY IF EXISTS "Owners can update tracks" ON public.organization_tracks;
CREATE POLICY "Owners can update tracks" ON public.organization_tracks FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.is_admin_caller())
WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.is_admin_caller());

DROP POLICY IF EXISTS "Owners can delete tracks" ON public.organization_tracks;
CREATE POLICY "Owners can delete tracks" ON public.organization_tracks FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.is_admin_caller());

DROP POLICY IF EXISTS "Owners can insert org videos" ON public.organization_videos;
CREATE POLICY "Owners can insert org videos" ON public.organization_videos FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.is_admin_caller());

DROP POLICY IF EXISTS "Owners can update org videos" ON public.organization_videos;
CREATE POLICY "Owners can update org videos" ON public.organization_videos FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.is_admin_caller())
WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.is_admin_caller());

DROP POLICY IF EXISTS "Owners can delete org videos" ON public.organization_videos;
CREATE POLICY "Owners can delete org videos" ON public.organization_videos FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.is_admin_caller());