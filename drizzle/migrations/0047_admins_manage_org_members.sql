DROP POLICY IF EXISTS "org owners manage members" ON public.organization_members;
CREATE POLICY "org owners manage members" ON public.organization_members
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_members.organization_id AND o.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_members.organization_id AND o.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "org owners remove members" ON public.organization_members;
CREATE POLICY "org owners remove members" ON public.organization_members
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_members.organization_id AND o.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);