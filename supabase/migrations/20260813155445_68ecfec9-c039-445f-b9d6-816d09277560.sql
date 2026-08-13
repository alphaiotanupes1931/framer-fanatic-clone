CREATE TABLE public.organization_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  image_url text,
  inventory integer,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.organization_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_products TO authenticated;
GRANT ALL ON public.organization_products TO service_role;

ALTER TABLE public.organization_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone"
ON public.organization_products FOR SELECT
USING (true);

CREATE POLICY "Org owners can insert products"
ON public.organization_products FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));

CREATE POLICY "Org owners can update products"
ON public.organization_products FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));

CREATE POLICY "Org owners can delete products"
ON public.organization_products FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));

CREATE INDEX idx_org_products_org ON public.organization_products(org_id);

CREATE TRIGGER organization_products_updated_at
BEFORE UPDATE ON public.organization_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.product_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.organization_products(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  buyer_id uuid,
  quantity integer NOT NULL DEFAULT 1,
  buyer_total_cents integer NOT NULL DEFAULT 0,
  seller_net_cents integer NOT NULL DEFAULT 0,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  stripe_fee_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_orders TO authenticated;
GRANT ALL ON public.product_orders TO service_role;

ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers and sellers can view their orders"
ON public.product_orders FOR SELECT TO authenticated
USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE INDEX idx_product_orders_org ON public.product_orders(org_id);
CREATE INDEX idx_product_orders_buyer ON public.product_orders(buyer_id);