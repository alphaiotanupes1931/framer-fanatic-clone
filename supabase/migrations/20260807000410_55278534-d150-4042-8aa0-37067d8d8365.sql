CREATE TABLE public.organization_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_polls TO authenticated;
GRANT SELECT ON public.organization_polls TO anon;
GRANT ALL ON public.organization_polls TO service_role;
ALTER TABLE public.organization_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Polls are viewable by everyone" ON public.organization_polls FOR SELECT USING (true);
CREATE POLICY "Org owners create polls" ON public.organization_polls FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE POLICY "Owner or admin update polls" ON public.organization_polls FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE POLICY "Owner or admin delete polls" ON public.organization_polls FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));

CREATE TABLE public.organization_poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.organization_polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_poll_options TO authenticated;
GRANT SELECT ON public.organization_poll_options TO anon;
GRANT ALL ON public.organization_poll_options TO service_role;
ALTER TABLE public.organization_poll_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Poll options viewable by everyone" ON public.organization_poll_options FOR SELECT USING (true);
CREATE POLICY "Poll creator manages options" ON public.organization_poll_options FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_polls p WHERE p.id = poll_id AND p.created_by = auth.uid()));
CREATE POLICY "Poll creator deletes options" ON public.organization_poll_options FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organization_polls p WHERE p.id = poll_id AND (p.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.organization_poll_votes (
  poll_id uuid NOT NULL REFERENCES public.organization_polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.organization_poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_poll_votes TO authenticated;
GRANT SELECT ON public.organization_poll_votes TO anon;
GRANT ALL ON public.organization_poll_votes TO service_role;
ALTER TABLE public.organization_poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Poll votes viewable by everyone" ON public.organization_poll_votes FOR SELECT USING (true);
CREATE POLICY "Users cast own vote" ON public.organization_poll_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.organization_polls p WHERE p.id = poll_id AND p.is_closed = false));
CREATE POLICY "Users change own vote" ON public.organization_poll_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own vote" ON public.organization_poll_votes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_org_polls_org ON public.organization_polls(org_id, created_at DESC);
CREATE INDEX idx_org_poll_options_poll ON public.organization_poll_options(poll_id, sort_order);
CREATE INDEX idx_org_poll_votes_poll ON public.organization_poll_votes(poll_id);