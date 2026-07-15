
CREATE TABLE public.organization_support_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER,
  interval TEXT NOT NULL DEFAULT 'one_time',
  image_url TEXT,
  join_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.organization_support_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_support_tiers TO authenticated;
GRANT ALL ON public.organization_support_tiers TO service_role;

ALTER TABLE public.organization_support_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Support tiers are viewable by everyone"
  ON public.organization_support_tiers FOR SELECT
  USING (true);

CREATE POLICY "Org owners can insert support tiers"
  ON public.organization_support_tiers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations o
            WHERE o.id = organization_id
              AND (o.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

CREATE POLICY "Org owners can update support tiers"
  ON public.organization_support_tiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations o
            WHERE o.id = organization_id
              AND (o.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

CREATE POLICY "Org owners can delete support tiers"
  ON public.organization_support_tiers FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations o
            WHERE o.id = organization_id
              AND (o.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

CREATE TRIGGER update_support_tiers_updated_at
  BEFORE UPDATE ON public.organization_support_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_support_tiers_org ON public.organization_support_tiers(organization_id, sort_order);
