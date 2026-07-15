
ALTER TABLE public.profile_sections
  ADD COLUMN IF NOT EXISTS year TEXT,
  ADD COLUMN IF NOT EXISTS subtitle TEXT;

CREATE TABLE IF NOT EXISTS public.artist_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  intent TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS artist_inquiries_artist_idx ON public.artist_inquiries(artist_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_inquiries TO authenticated;
GRANT INSERT ON public.artist_inquiries TO anon;
GRANT ALL ON public.artist_inquiries TO service_role;

ALTER TABLE public.artist_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can send inquiries" ON public.artist_inquiries;
CREATE POLICY "anyone can send inquiries" ON public.artist_inquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "artist reads own inquiries" ON public.artist_inquiries;
CREATE POLICY "artist reads own inquiries" ON public.artist_inquiries
  FOR SELECT TO authenticated USING (auth.uid() = artist_id);

DROP POLICY IF EXISTS "artist deletes own inquiries" ON public.artist_inquiries;
CREATE POLICY "artist deletes own inquiries" ON public.artist_inquiries
  FOR DELETE TO authenticated USING (auth.uid() = artist_id);
