
CREATE TABLE public.organization_dues_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  amount_cents integer NOT NULL CHECK (amount_cents >= 100),
  interval text NOT NULL DEFAULT 'yearly' CHECK (interval IN ('monthly','quarterly','yearly','one_time')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_dues_tiers TO authenticated;
GRANT SELECT ON public.organization_dues_tiers TO anon;
GRANT ALL ON public.organization_dues_tiers TO service_role;
ALTER TABLE public.organization_dues_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dues_tiers_public_read" ON public.organization_dues_tiers
  FOR SELECT USING (true);
CREATE POLICY "dues_tiers_owner_insert" ON public.organization_dues_tiers
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid())
  );
CREATE POLICY "dues_tiers_owner_update" ON public.organization_dues_tiers
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid())
  );
CREATE POLICY "dues_tiers_owner_delete" ON public.organization_dues_tiers
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid())
  );

CREATE TABLE public.organization_dues_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tier_id uuid REFERENCES public.organization_dues_tiers(id) ON DELETE SET NULL,
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  amount_cents integer NOT NULL,
  buyer_total_cents integer NOT NULL,
  owner_net_cents integer NOT NULL,
  platform_fee_cents integer NOT NULL,
  stripe_fee_cents integer NOT NULL,
  interval text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  period_start date,
  period_end date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organization_dues_payments TO authenticated;
GRANT ALL ON public.organization_dues_payments TO service_role;
ALTER TABLE public.organization_dues_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dues_payments_member_read" ON public.organization_dues_payments
  FOR SELECT TO authenticated USING (member_id = auth.uid());
CREATE POLICY "dues_payments_owner_read" ON public.organization_dues_payments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid())
  );

CREATE INDEX idx_dues_tiers_org ON public.organization_dues_tiers(org_id, sort_order);
CREATE INDEX idx_dues_payments_org ON public.organization_dues_payments(org_id, created_at DESC);
CREATE INDEX idx_dues_payments_member ON public.organization_dues_payments(member_id, created_at DESC);

CREATE TRIGGER update_dues_tiers_updated_at BEFORE UPDATE ON public.organization_dues_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dues_payments_updated_at BEFORE UPDATE ON public.organization_dues_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
