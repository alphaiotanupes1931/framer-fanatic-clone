
CREATE TABLE public.event_promoters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promoter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  referral_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  status TEXT NOT NULL DEFAULT 'invited',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX event_promoters_event_id_idx ON public.event_promoters(event_id);
CREATE INDEX event_promoters_organizer_id_idx ON public.event_promoters(organizer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_promoters TO authenticated;
GRANT ALL ON public.event_promoters TO service_role;

ALTER TABLE public.event_promoters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage their event promoters"
  ON public.event_promoters FOR ALL
  USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Promoters can view their own record"
  ON public.event_promoters FOR SELECT
  USING (auth.uid() = promoter_user_id);
