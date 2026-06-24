
-- 1) profile category
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS category text;

-- 2) profile_sections
CREATE TABLE IF NOT EXISTS public.profile_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text,
  body text,
  media_url text,
  link_url text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profile_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_sections TO authenticated;
GRANT ALL ON public.profile_sections TO service_role;
ALTER TABLE public.profile_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ps read all" ON public.profile_sections FOR SELECT USING (true);
CREATE POLICY "ps owner insert" ON public.profile_sections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ps owner update" ON public.profile_sections FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ps owner delete" ON public.profile_sections FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_profile_sections_user_kind ON public.profile_sections(user_id, kind, order_index);

-- 3) organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('arts_org','business','community_assoc','group')),
  subtype text,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  bio text,
  avatar_url text,
  banner_url text,
  website text,
  phone text,
  email text,
  address text,
  neighborhood text,
  hours jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organizations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orgs read all" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "orgs artist or admin insert" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id AND (public.has_role(auth.uid(),'artist') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "orgs owner or admin update" ON public.organizations FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "orgs owner or admin delete" ON public.organizations FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_orgs_type_sub ON public.organizations(type, subtype, neighborhood);

-- 4) organization_posts (opportunities/press/updates)
CREATE TABLE IF NOT EXISTS public.organization_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('opportunity','press','update')),
  title text NOT NULL,
  body text,
  link_url text,
  media_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organization_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_posts TO authenticated;
GRANT ALL ON public.organization_posts TO service_role;
ALTER TABLE public.organization_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "op read all" ON public.organization_posts FOR SELECT USING (true);
CREATE POLICY "op owner insert" ON public.organization_posts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND (o.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
    AND author_id = auth.uid()
  );
CREATE POLICY "op owner update" ON public.organization_posts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND (o.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "op owner delete" ON public.organization_posts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND (o.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE INDEX IF NOT EXISTS idx_org_posts_org_kind ON public.organization_posts(org_id, kind, created_at DESC);

-- 5) organization_comments
CREATE TABLE IF NOT EXISTS public.organization_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organization_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_comments TO authenticated;
GRANT ALL ON public.organization_comments TO service_role;
ALTER TABLE public.organization_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oc read all" ON public.organization_comments FOR SELECT USING (true);
CREATE POLICY "oc auth insert" ON public.organization_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "oc author or org owner delete" ON public.organization_comments FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND (o.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );
CREATE INDEX IF NOT EXISTS idx_org_comments_org ON public.organization_comments(org_id, created_at DESC);

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_ps_updated ON public.profile_sections;
CREATE TRIGGER trg_ps_updated BEFORE UPDATE ON public.profile_sections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_orgs_updated ON public.organizations;
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_op_updated ON public.organization_posts;
CREATE TRIGGER trg_op_updated BEFORE UPDATE ON public.organization_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
