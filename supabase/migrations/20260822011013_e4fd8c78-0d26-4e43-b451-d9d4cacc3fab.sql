CREATE OR REPLACE FUNCTION public.can_view_org(_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _org IS NULL THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = _org
        AND (
          COALESCE(o.is_public, true) = true
          OR o.owner_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.is_org_member(o.id, auth.uid())
        )
    )
  END
$$;

REVOKE ALL ON FUNCTION public.can_view_org(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_org(uuid) TO anon, authenticated, service_role;

-- events (standalone events keep public visibility)
DROP POLICY "events viewable by everyone" ON public.events;
CREATE POLICY "events viewable when page is visible" ON public.events
FOR SELECT USING (organization_id IS NULL OR public.can_view_org(organization_id));

DROP POLICY "Org artists viewable by everyone" ON public.organization_artists;
CREATE POLICY "Org artists viewable when page is visible" ON public.organization_artists
FOR SELECT USING (public.can_view_org(org_id));

DROP POLICY "Artworks are viewable by everyone" ON public.organization_artworks;
CREATE POLICY "Artworks viewable when page is visible" ON public.organization_artworks
FOR SELECT USING (public.can_view_org(org_id));

DROP POLICY "Board members viewable by everyone" ON public.organization_board_members;
CREATE POLICY "Board members viewable when page is visible" ON public.organization_board_members
FOR SELECT USING (public.can_view_org(org_id));

DROP POLICY "oc read all" ON public.organization_comments;
CREATE POLICY "oc read when page is visible" ON public.organization_comments
FOR SELECT USING (public.can_view_org(org_id));

DROP POLICY "Documents viewable by everyone" ON public.organization_documents;
CREATE POLICY "Documents viewable when page is visible" ON public.organization_documents
FOR SELECT USING (public.can_view_org(org_id));

DROP POLICY "dues_tiers_public_read" ON public.organization_dues_tiers;
CREATE POLICY "dues_tiers_read_when_visible" ON public.organization_dues_tiers
FOR SELECT USING (public.can_view_org(org_id));

DROP POLICY "followers viewable by all" ON public.organization_followers;
CREATE POLICY "followers viewable when page is visible" ON public.organization_followers
FOR SELECT USING (user_id = auth.uid() OR public.can_view_org(organization_id));

DROP POLICY "org members viewable by all" ON public.organization_members;
CREATE POLICY "org members viewable when page is visible" ON public.organization_members
FOR SELECT USING (user_id = auth.uid() OR public.can_view_org(organization_id));

DROP POLICY "Polls are viewable by everyone" ON public.organization_polls;
CREATE POLICY "Polls viewable when page is visible" ON public.organization_polls
FOR SELECT USING (public.can_view_org(org_id));

DROP POLICY "op read all" ON public.organization_posts;
CREATE POLICY "op read when page is visible" ON public.organization_posts
FOR SELECT USING (public.can_view_org(org_id));

DROP POLICY "price items readable by everyone" ON public.organization_price_items;
CREATE POLICY "price items readable when page is visible" ON public.organization_price_items
FOR SELECT USING (public.can_view_org(organization_id));

DROP POLICY "Products are viewable by everyone" ON public.organization_products;
CREATE POLICY "Products viewable when page is visible" ON public.organization_products
FOR SELECT USING (public.can_view_org(org_id));

DROP POLICY "Releases are viewable by everyone" ON public.organization_releases;
CREATE POLICY "Releases viewable when page is visible" ON public.organization_releases
FOR SELECT USING (public.can_view_org(org_id));

DROP POLICY "Org sponsors viewable by everyone" ON public.organization_sponsors;
CREATE POLICY "Org sponsors viewable when page is visible" ON public.organization_sponsors
FOR SELECT USING (public.can_view_org(org_id));

DROP POLICY "Support tiers are viewable by everyone" ON public.organization_support_tiers;
CREATE POLICY "Support tiers viewable when page is visible" ON public.organization_support_tiers
FOR SELECT USING (public.can_view_org(organization_id));

DROP POLICY "Tracks are viewable by everyone" ON public.organization_tracks;
CREATE POLICY "Tracks viewable when page is visible" ON public.organization_tracks
FOR SELECT USING (public.can_view_org(org_id));

DROP POLICY "Org videos are viewable by everyone" ON public.organization_videos;
CREATE POLICY "Org videos viewable when page is visible" ON public.organization_videos
FOR SELECT USING (public.can_view_org(org_id));

DROP POLICY "Voting items viewable by everyone" ON public.organization_votes;
CREATE POLICY "Voting items viewable when page is visible" ON public.organization_votes
FOR SELECT USING (public.can_view_org(org_id));