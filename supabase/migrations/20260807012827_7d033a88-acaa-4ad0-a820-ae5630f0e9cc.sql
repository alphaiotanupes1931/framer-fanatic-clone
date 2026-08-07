CREATE TABLE public.organization_artists (
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
CREATE INDEX idx_org_artists_org ON public.organization_artists (org_id, sort_order, created_at);
GRANT SELECT ON public.organization_artists TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_artists TO authenticated;
GRANT ALL ON public.organization_artists TO service_role;
ALTER TABLE public.organization_artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org artists viewable by everyone" ON public.organization_artists FOR SELECT USING (true);
CREATE POLICY "Org owners add artists" ON public.organization_artists FOR INSERT TO authenticated WITH CHECK ((EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_artists.org_id AND o.owner_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org owners update artists" ON public.organization_artists FOR UPDATE TO authenticated USING ((EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_artists.org_id AND o.owner_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org owners delete artists" ON public.organization_artists FOR DELETE TO authenticated USING ((EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_artists.org_id AND o.owner_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_org_artists_updated_at BEFORE UPDATE ON public.organization_artists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();