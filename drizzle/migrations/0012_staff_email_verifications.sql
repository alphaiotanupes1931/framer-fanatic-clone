CREATE TABLE public.staff_email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  code text,
  expires_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX staff_email_verifications_user_email_key
  ON public.staff_email_verifications (user_id, lower(email));
GRANT ALL ON public.staff_email_verifications TO service_role;
ALTER TABLE public.staff_email_verifications ENABLE ROW LEVEL SECURITY;