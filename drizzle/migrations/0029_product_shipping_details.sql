ALTER TABLE public.organization_products
  ADD COLUMN IF NOT EXISTS requires_shipping boolean NOT NULL DEFAULT true;

ALTER TABLE public.product_orders
  ADD COLUMN IF NOT EXISTS ship_name text,
  ADD COLUMN IF NOT EXISTS ship_email text,
  ADD COLUMN IF NOT EXISTS ship_phone text,
  ADD COLUMN IF NOT EXISTS ship_address jsonb,
  ADD COLUMN IF NOT EXISTS buyer_note text;