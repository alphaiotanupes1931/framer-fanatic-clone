ALTER TABLE public.organization_staff_logins
  ADD COLUMN IF NOT EXISTS staff_user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS organization_staff_logins_staff_user_id_key
  ON public.organization_staff_logins (staff_user_id)
  WHERE staff_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_org_staff(_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_staff_logins
    WHERE organization_id = _organization_id
      AND staff_user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.organization_owner_id(_organization_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_id FROM public.organizations WHERE id = _organization_id
$$;

GRANT EXECUTE ON FUNCTION public.is_org_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.organization_owner_id(uuid) TO authenticated;

CREATE POLICY "Staff can view assigned business page"
  ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_staff(id));

CREATE POLICY "Staff can update assigned business page"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_staff(id))
  WITH CHECK (public.is_org_staff(id) AND owner_id = public.organization_owner_id(id));

CREATE POLICY "Staff can insert assigned organization events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND organization_id IS NOT NULL AND public.is_org_staff(organization_id));

CREATE POLICY "Staff can update assigned organization events"
  ON public.events FOR UPDATE TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_staff(organization_id))
  WITH CHECK (organization_id IS NOT NULL AND public.is_org_staff(organization_id));

CREATE POLICY "Staff can delete assigned organization events"
  ON public.events FOR DELETE TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_staff(organization_id));

CREATE POLICY "Staff can view assigned ticket types"
  ON public.ticket_types FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organization_id IS NOT NULL AND public.is_org_staff(e.organization_id)));

CREATE POLICY "Staff can insert assigned ticket types"
  ON public.ticket_types FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organization_id IS NOT NULL AND public.is_org_staff(e.organization_id)));

CREATE POLICY "Staff can update assigned ticket types"
  ON public.ticket_types FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organization_id IS NOT NULL AND public.is_org_staff(e.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organization_id IS NOT NULL AND public.is_org_staff(e.organization_id)));

CREATE POLICY "Staff can delete assigned ticket types"
  ON public.ticket_types FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organization_id IS NOT NULL AND public.is_org_staff(e.organization_id)));

CREATE POLICY "Staff can manage assigned organization artists"
  ON public.organization_artists FOR ALL TO authenticated
  USING (public.is_org_staff(org_id))
  WITH CHECK (public.is_org_staff(org_id));

CREATE POLICY "Staff can manage assigned organization artworks"
  ON public.organization_artworks FOR ALL TO authenticated
  USING (public.is_org_staff(org_id))
  WITH CHECK (public.is_org_staff(org_id));

CREATE POLICY "Staff can manage assigned board members"
  ON public.organization_board_members FOR ALL TO authenticated
  USING (public.is_org_staff(org_id))
  WITH CHECK (public.is_org_staff(org_id));

CREATE POLICY "Staff can manage assigned documents"
  ON public.organization_documents FOR ALL TO authenticated
  USING (public.is_org_staff(org_id))
  WITH CHECK (public.is_org_staff(org_id));

CREATE POLICY "Staff can manage assigned dues tiers"
  ON public.organization_dues_tiers FOR ALL TO authenticated
  USING (public.is_org_staff(org_id))
  WITH CHECK (public.is_org_staff(org_id));

CREATE POLICY "Staff can view assigned dues payments"
  ON public.organization_dues_payments FOR SELECT TO authenticated
  USING (public.is_org_staff(org_id));

CREATE POLICY "Staff can manage assigned exhibition images"
  ON public.organization_exhibition_images FOR ALL TO authenticated
  USING (public.is_org_staff(org_id))
  WITH CHECK (public.is_org_staff(org_id));

CREATE POLICY "Staff can manage assigned exhibitions"
  ON public.organization_exhibitions FOR ALL TO authenticated
  USING (public.is_org_staff(org_id))
  WITH CHECK (public.is_org_staff(org_id));

CREATE POLICY "Staff can manage assigned organization posts"
  ON public.organization_posts FOR ALL TO authenticated
  USING (public.is_org_staff(org_id))
  WITH CHECK (public.is_org_staff(org_id));

CREATE POLICY "Staff can manage assigned price items"
  ON public.organization_price_items FOR ALL TO authenticated
  USING (public.is_org_staff(organization_id))
  WITH CHECK (public.is_org_staff(organization_id));

CREATE POLICY "Staff can manage assigned products"
  ON public.organization_products FOR ALL TO authenticated
  USING (public.is_org_staff(org_id))
  WITH CHECK (public.is_org_staff(org_id));

CREATE POLICY "Staff can manage assigned releases"
  ON public.organization_releases FOR ALL TO authenticated
  USING (public.is_org_staff(org_id))
  WITH CHECK (public.is_org_staff(org_id));

CREATE POLICY "Staff can manage assigned sponsors"
  ON public.organization_sponsors FOR ALL TO authenticated
  USING (public.is_org_staff(org_id))
  WITH CHECK (public.is_org_staff(org_id));

CREATE POLICY "Staff can manage assigned support tiers"
  ON public.organization_support_tiers FOR ALL TO authenticated
  USING (public.is_org_staff(organization_id))
  WITH CHECK (public.is_org_staff(organization_id));

CREATE POLICY "Staff can manage assigned tracks"
  ON public.organization_tracks FOR ALL TO authenticated
  USING (public.is_org_staff(org_id))
  WITH CHECK (public.is_org_staff(org_id));

CREATE POLICY "Staff can manage assigned videos"
  ON public.organization_videos FOR ALL TO authenticated
  USING (public.is_org_staff(org_id))
  WITH CHECK (public.is_org_staff(org_id));

CREATE POLICY "Staff can manage assigned votes"
  ON public.organization_votes FOR ALL TO authenticated
  USING (public.is_org_staff(org_id))
  WITH CHECK (public.is_org_staff(org_id));

CREATE POLICY "Staff can view assigned polls"
  ON public.organization_polls FOR SELECT TO authenticated
  USING (public.is_org_staff(org_id));

CREATE POLICY "Staff can manage assigned poll options"
  ON public.organization_poll_options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organization_polls p WHERE p.id = poll_id AND public.is_org_staff(p.org_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_polls p WHERE p.id = poll_id AND public.is_org_staff(p.org_id)));

CREATE POLICY "Staff can manage assigned comments"
  ON public.organization_comments FOR ALL TO authenticated
  USING (public.is_org_staff(org_id))
  WITH CHECK (public.is_org_staff(org_id));

CREATE POLICY "Staff can view assigned followers"
  ON public.organization_followers FOR SELECT TO authenticated
  USING (public.is_org_staff(organization_id));