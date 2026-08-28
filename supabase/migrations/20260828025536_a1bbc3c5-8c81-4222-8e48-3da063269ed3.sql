CREATE TABLE public.organization_exhibitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  statement TEXT,
  venue TEXT,
  location TEXT,
  year_start INTEGER,
  year_end INTEGER,
  cover_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_exhibitions_org ON public.organization_exhibitions(org_id, order_index);

GRANT SELECT ON public.organization_exhibitions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_exhibitions TO authenticated;
GRANT ALL ON public.organization_exhibitions TO service_role;

ALTER TABLE public.organization_exhibitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exhibitions viewable when page is visible"
  ON public.organization_exhibitions FOR SELECT
  USING (public.can_view_org(org_id));

CREATE POLICY "Owners can insert exhibitions"
  ON public.organization_exhibitions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));

CREATE POLICY "Owners can update exhibitions"
  ON public.organization_exhibitions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));

CREATE POLICY "Owners can delete exhibitions"
  ON public.organization_exhibitions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));

CREATE TRIGGER update_organization_exhibitions_updated_at
  BEFORE UPDATE ON public.organization_exhibitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.organization_exhibition_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exhibition_id UUID NOT NULL REFERENCES public.organization_exhibitions(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  title TEXT,
  medium TEXT,
  dimensions TEXT,
  year INTEGER,
  caption TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_exhibition_images_ex ON public.organization_exhibition_images(exhibition_id, order_index);

GRANT SELECT ON public.organization_exhibition_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_exhibition_images TO authenticated;
GRANT ALL ON public.organization_exhibition_images TO service_role;

ALTER TABLE public.organization_exhibition_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exhibition images viewable when page is visible"
  ON public.organization_exhibition_images FOR SELECT
  USING (public.can_view_org(org_id));

CREATE POLICY "Owners can insert exhibition images"
  ON public.organization_exhibition_images FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));

CREATE POLICY "Owners can update exhibition images"
  ON public.organization_exhibition_images FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));

CREATE POLICY "Owners can delete exhibition images"
  ON public.organization_exhibition_images FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));

CREATE TRIGGER update_organization_exhibition_images_updated_at
  BEFORE UPDATE ON public.organization_exhibition_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();