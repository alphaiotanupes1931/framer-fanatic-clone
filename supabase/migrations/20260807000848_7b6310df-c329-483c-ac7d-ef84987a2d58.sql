CREATE TABLE public.organization_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  vote_type text NOT NULL DEFAULT 'yes_no',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_votes TO authenticated;
GRANT SELECT ON public.organization_votes TO anon;
GRANT ALL ON public.organization_votes TO service_role;
ALTER TABLE public.organization_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Voting items viewable by everyone" ON public.organization_votes FOR SELECT USING (true);
CREATE POLICY "Org owners create voting items" ON public.organization_votes FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE POLICY "Owner or admin update voting items" ON public.organization_votes FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE POLICY "Owner or admin delete voting items" ON public.organization_votes FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));

CREATE TABLE public.organization_vote_ballots (
  vote_id uuid NOT NULL REFERENCES public.organization_votes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  choice text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (vote_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_vote_ballots TO authenticated;
GRANT SELECT ON public.organization_vote_ballots TO anon;
GRANT ALL ON public.organization_vote_ballots TO service_role;
ALTER TABLE public.organization_vote_ballots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ballots viewable by everyone" ON public.organization_vote_ballots FOR SELECT USING (true);
CREATE POLICY "Users cast own ballot" ON public.organization_vote_ballots FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.organization_votes v WHERE v.id = vote_id AND now() >= v.starts_at AND now() <= v.ends_at));
CREATE POLICY "Users change own ballot" ON public.organization_vote_ballots FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own ballot" ON public.organization_vote_ballots FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_org_votes_org ON public.organization_votes(org_id, created_at DESC);
CREATE INDEX idx_org_vote_ballots_vote ON public.organization_vote_ballots(vote_id);