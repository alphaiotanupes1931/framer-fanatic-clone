ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS bylaws text,
  ADD COLUMN IF NOT EXISTS rules text;