CREATE TABLE public.organization_price_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer,
  price_label text,
  section text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_price_items_org ON public.organization_price_items(organization_id, sort_order);

GRANT SELECT ON public.organization_price_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_price_items TO authenticated;
GRANT ALL ON public.organization_price_items TO service_role;

ALTER TABLE public.organization_price_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price items readable by everyone"
  ON public.organization_price_items FOR SELECT
  USING (true);

CREATE POLICY "price items owner insert"
  ON public.organization_price_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid()));

CREATE POLICY "price items owner update"
  ON public.organization_price_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid()));

CREATE POLICY "price items owner delete"
  ON public.organization_price_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid()));

CREATE TRIGGER trg_org_price_items_updated
  BEFORE UPDATE ON public.organization_price_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();