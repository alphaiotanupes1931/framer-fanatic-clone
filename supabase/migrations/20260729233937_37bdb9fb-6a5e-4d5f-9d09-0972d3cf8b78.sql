CREATE TABLE public.email_audiences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.email_audience_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audience_id UUID NOT NULL REFERENCES public.email_audiences(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (audience_id, email)
);

CREATE INDEX idx_email_audiences_owner ON public.email_audiences(owner_id, created_at DESC);
CREATE INDEX idx_email_audience_contacts_aud ON public.email_audience_contacts(audience_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_audiences TO authenticated;
GRANT ALL ON public.email_audiences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_audience_contacts TO authenticated;
GRANT ALL ON public.email_audience_contacts TO service_role;

ALTER TABLE public.email_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_audience_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own audiences" ON public.email_audiences FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "own audience contacts" ON public.email_audience_contacts FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());