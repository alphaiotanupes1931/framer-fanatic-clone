CREATE TABLE public.organization_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  website text,
  tier text,
  blurb text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.organization_sponsors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_sponsors TO authenticated;
GRANT ALL ON public.organization_sponsors TO service_role;

ALTER TABLE public.organization_sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org sponsors viewable by everyone" ON public.organization_sponsors FOR SELECT USING (true);
CREATE POLICY "Org owners add sponsors" ON public.organization_sponsors FOR INSERT TO authenticated
  WITH CHECK ((EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_sponsors.org_id AND o.owner_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org owners update sponsors" ON public.organization_sponsors FOR UPDATE TO authenticated
  USING ((EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_sponsors.org_id AND o.owner_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org owners delete sponsors" ON public.organization_sponsors FOR DELETE TO authenticated
  USING ((EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_sponsors.org_id AND o.owner_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX organization_sponsors_org_idx ON public.organization_sponsors(org_id, sort_order);

CREATE TRIGGER update_organization_sponsors_updated_at
  BEFORE UPDATE ON public.organization_sponsors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();