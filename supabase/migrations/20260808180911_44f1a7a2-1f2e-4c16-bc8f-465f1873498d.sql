-- Ensure helper functions exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE IF NOT EXISTS public.organization_artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  bio text,
  photo_url text,
  website text,
  portfolio_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_org_artists_org ON public.organization_artists (org_id, sort_order, created_at);
GRANT SELECT ON public.organization_artists TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_artists TO authenticated;
GRANT ALL ON public.organization_artists TO service_role;
ALTER TABLE public.organization_artists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org artists viewable by everyone" ON public.organization_artists;
CREATE POLICY "Org artists viewable by everyone" ON public.organization_artists FOR SELECT USING (true);
DROP POLICY IF EXISTS "Org owners add artists" ON public.organization_artists;
CREATE POLICY "Org owners add artists" ON public.organization_artists FOR INSERT TO authenticated WITH CHECK ((EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_artists.org_id AND o.owner_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Org owners update artists" ON public.organization_artists;
CREATE POLICY "Org owners update artists" ON public.organization_artists FOR UPDATE TO authenticated USING ((EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_artists.org_id AND o.owner_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Org owners delete artists" ON public.organization_artists;
CREATE POLICY "Org owners delete artists" ON public.organization_artists FOR DELETE TO authenticated USING ((EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_artists.org_id AND o.owner_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'::app_role));
DROP TRIGGER IF EXISTS update_org_artists_updated_at ON public.organization_artists;
CREATE TRIGGER update_org_artists_updated_at BEFORE UPDATE ON public.organization_artists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.organization_board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  bio text,
  email text,
  photo_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_board_members TO authenticated;
GRANT SELECT ON public.organization_board_members TO anon;
GRANT ALL ON public.organization_board_members TO service_role;
ALTER TABLE public.organization_board_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Board members viewable by everyone" ON public.organization_board_members;
CREATE POLICY "Board members viewable by everyone" ON public.organization_board_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Org owners add board members" ON public.organization_board_members;
CREATE POLICY "Org owners add board members" ON public.organization_board_members FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Org owners update board members" ON public.organization_board_members;
CREATE POLICY "Org owners update board members" ON public.organization_board_members FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Org owners delete board members" ON public.organization_board_members;
CREATE POLICY "Org owners delete board members" ON public.organization_board_members FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_org_board_members_org ON public.organization_board_members(org_id, sort_order, created_at);
DROP TRIGGER IF EXISTS update_org_board_members_updated_at ON public.organization_board_members;
CREATE TRIGGER update_org_board_members_updated_at BEFORE UPDATE ON public.organization_board_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.organization_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  doc_type text NOT NULL DEFAULT 'document',
  file_url text NOT NULL,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_documents TO authenticated;
GRANT SELECT ON public.organization_documents TO anon;
GRANT ALL ON public.organization_documents TO service_role;
ALTER TABLE public.organization_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Documents viewable by everyone" ON public.organization_documents;
CREATE POLICY "Documents viewable by everyone" ON public.organization_documents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Org owners upload documents" ON public.organization_documents;
CREATE POLICY "Org owners upload documents" ON public.organization_documents FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Owner or admin update documents" ON public.organization_documents;
CREATE POLICY "Owner or admin update documents" ON public.organization_documents FOR UPDATE TO authenticated USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Owner or admin delete documents" ON public.organization_documents;
CREATE POLICY "Owner or admin delete documents" ON public.organization_documents FOR DELETE TO authenticated USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_org_documents_org ON public.organization_documents(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.organization_votes (
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
DROP POLICY IF EXISTS "Voting items viewable by everyone" ON public.organization_votes;
CREATE POLICY "Voting items viewable by everyone" ON public.organization_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Org owners create voting items" ON public.organization_votes;
CREATE POLICY "Org owners create voting items" ON public.organization_votes FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Owner or admin update voting items" ON public.organization_votes;
CREATE POLICY "Owner or admin update voting items" ON public.organization_votes FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Owner or admin delete voting items" ON public.organization_votes;
CREATE POLICY "Owner or admin delete voting items" ON public.organization_votes FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_org_votes_org ON public.organization_votes(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.organization_vote_ballots (
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
DROP POLICY IF EXISTS "Ballots viewable by everyone" ON public.organization_vote_ballots;
CREATE POLICY "Ballots viewable by everyone" ON public.organization_vote_ballots FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users cast own ballot" ON public.organization_vote_ballots;
CREATE POLICY "Users cast own ballot" ON public.organization_vote_ballots FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.organization_votes v WHERE v.id = vote_id AND now() >= v.starts_at AND now() <= v.ends_at));
DROP POLICY IF EXISTS "Users change own ballot" ON public.organization_vote_ballots;
CREATE POLICY "Users change own ballot" ON public.organization_vote_ballots FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users remove own ballot" ON public.organization_vote_ballots;
CREATE POLICY "Users remove own ballot" ON public.organization_vote_ballots FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_org_vote_ballots_vote ON public.organization_vote_ballots(vote_id);

CREATE TABLE IF NOT EXISTS public.organization_polls (
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
DROP POLICY IF EXISTS "Polls are viewable by everyone" ON public.organization_polls;
CREATE POLICY "Polls are viewable by everyone" ON public.organization_polls FOR SELECT USING (true);
DROP POLICY IF EXISTS "Org owners create polls" ON public.organization_polls;
CREATE POLICY "Org owners create polls" ON public.organization_polls FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Owner or admin update polls" ON public.organization_polls;
CREATE POLICY "Owner or admin update polls" ON public.organization_polls FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Owner or admin delete polls" ON public.organization_polls;
CREATE POLICY "Owner or admin delete polls" ON public.organization_polls FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_org_polls_org ON public.organization_polls(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.organization_poll_options (
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
DROP POLICY IF EXISTS "Poll options viewable by everyone" ON public.organization_poll_options;
CREATE POLICY "Poll options viewable by everyone" ON public.organization_poll_options FOR SELECT USING (true);
DROP POLICY IF EXISTS "Poll creator manages options" ON public.organization_poll_options;
CREATE POLICY "Poll creator manages options" ON public.organization_poll_options FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.organization_polls p WHERE p.id = poll_id AND p.created_by = auth.uid()));
DROP POLICY IF EXISTS "Poll creator deletes options" ON public.organization_poll_options;
CREATE POLICY "Poll creator deletes options" ON public.organization_poll_options FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.organization_polls p WHERE p.id = poll_id AND (p.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE INDEX IF NOT EXISTS idx_org_poll_options_poll ON public.organization_poll_options(poll_id, sort_order);

CREATE TABLE IF NOT EXISTS public.organization_poll_votes (
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
DROP POLICY IF EXISTS "Poll votes viewable by everyone" ON public.organization_poll_votes;
CREATE POLICY "Poll votes viewable by everyone" ON public.organization_poll_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users cast own vote" ON public.organization_poll_votes;
CREATE POLICY "Users cast own vote" ON public.organization_poll_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.organization_polls p WHERE p.id = poll_id AND p.is_closed = false));
DROP POLICY IF EXISTS "Users change own vote" ON public.organization_poll_votes;
CREATE POLICY "Users change own vote" ON public.organization_poll_votes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users remove own vote" ON public.organization_poll_votes;
CREATE POLICY "Users remove own vote" ON public.organization_poll_votes FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_org_poll_votes_poll ON public.organization_poll_votes(poll_id);