ALTER TABLE public.organizations DROP CONSTRAINT organizations_business_offer_check;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_business_offer_check CHECK (business_offer IS NULL OR business_offer IN ('Product', 'Service', 'Both'));
CREATE TABLE public.organization_product_categories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 name text NOT NULL CHECK (length(trim(name)) > 0),
 cover_url text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(org_id, name)
);
GRANT SELECT ON public.organization_product_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_product_categories TO authenticated;
GRANT ALL ON public.organization_product_categories TO service_role;
ALTER TABLE public.organization_product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories visible with page" ON public.organization_product_categories FOR SELECT USING (public.can_view_org(org_id));
CREATE POLICY "Owners manage product categories" ON public.organization_product_categories FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE POLICY "Staff manage assigned product categories" ON public.organization_product_categories FOR ALL TO authenticated USING (public.is_org_staff(org_id)) WITH CHECK (public.is_org_staff(org_id));
ALTER TABLE public.organization_artworks ADD COLUMN product_category_id uuid REFERENCES public.organization_product_categories(id) ON DELETE CASCADE;
CREATE INDEX organization_artworks_product_category_idx ON public.organization_artworks(product_category_id);