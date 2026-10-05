DROP POLICY IF EXISTS "events viewable when page is visible" ON public.events;
CREATE POLICY "events viewable when page is visible" ON public.events FOR SELECT TO public
USING (
  ((organization_id IS NULL) OR public.can_view_org(organization_id))
  AND (
    is_published IS NOT FALSE
    OR auth.uid() = user_id
    OR (organization_id IS NOT NULL AND (public.organization_owner_id(organization_id) = auth.uid() OR public.is_org_staff(organization_id)))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);