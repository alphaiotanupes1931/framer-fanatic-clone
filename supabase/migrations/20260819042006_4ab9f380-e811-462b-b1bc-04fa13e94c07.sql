ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS organization_members_user_public_idx
  ON public.organization_members (user_id, is_public);