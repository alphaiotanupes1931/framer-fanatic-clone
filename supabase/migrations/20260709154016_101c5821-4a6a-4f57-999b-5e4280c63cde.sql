
CREATE TABLE public.organization_followers (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.organization_followers TO authenticated;
GRANT SELECT ON public.organization_followers TO anon;
GRANT ALL ON public.organization_followers TO service_role;
ALTER TABLE public.organization_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "followers viewable by all" ON public.organization_followers FOR SELECT USING (true);
CREATE POLICY "users follow orgs" ON public.organization_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users unfollow orgs" ON public.organization_followers FOR DELETE USING (auth.uid() = user_id);
