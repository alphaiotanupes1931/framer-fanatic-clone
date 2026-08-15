CREATE TABLE public.organization_artworks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT,
  medium TEXT,
  dimensions TEXT,
  description TEXT,
  media_url TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_organization_artworks_org ON public.organization_artworks(org_id, order_index);

GRANT SELECT ON public.organization_artworks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_artworks TO authenticated;
GRANT ALL ON public.organization_artworks TO service_role;

ALTER TABLE public.organization_artworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artworks are viewable by everyone"
  ON public.organization_artworks FOR SELECT
  USING (true);

CREATE POLICY "Owners can insert artworks"
  ON public.organization_artworks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));

CREATE POLICY "Owners can update artworks"
  ON public.organization_artworks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));

CREATE POLICY "Owners can delete artworks"
  ON public.organization_artworks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));

CREATE TRIGGER update_organization_artworks_updated_at
  BEFORE UPDATE ON public.organization_artworks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();