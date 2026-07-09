
CREATE TABLE public.organization_members (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.organization_members TO authenticated;
GRANT SELECT ON public.organization_members TO anon;
GRANT ALL ON public.organization_members TO service_role;

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members viewable by all"
  ON public.organization_members FOR SELECT
  USING (true);

CREATE POLICY "users can join orgs"
  ON public.organization_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can leave orgs"
  ON public.organization_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
