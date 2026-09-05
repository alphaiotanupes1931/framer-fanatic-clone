ALTER TABLE public.organization_staff_logins
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_code text,
  ADD COLUMN IF NOT EXISTS verification_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Existing staff logins were created before verification existed; keep them working.
UPDATE public.organization_staff_logins
SET email_verified = true, verified_at = COALESCE(verified_at, now())
WHERE email_verified = false AND verification_code IS NULL;