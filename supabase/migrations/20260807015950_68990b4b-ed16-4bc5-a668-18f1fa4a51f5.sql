ALTER TABLE public.organization_posts
  ADD COLUMN IF NOT EXISTS opportunity_type text,
  ADD COLUMN IF NOT EXISTS deadline date;