ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS cv jsonb NOT NULL DEFAULT '{}'::jsonb;