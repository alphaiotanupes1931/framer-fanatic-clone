
-- 1) site_content table for editable landing text
CREATE TABLE IF NOT EXISTS public.site_content (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_content read all" ON public.site_content;
CREATE POLICY "site_content read all" ON public.site_content
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_content admin insert" ON public.site_content;
CREATE POLICY "site_content admin insert" ON public.site_content
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "site_content admin update" ON public.site_content;
CREATE POLICY "site_content admin update" ON public.site_content
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "site_content admin delete" ON public.site_content;
CREATE POLICY "site_content admin delete" ON public.site_content
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS site_content_updated_at ON public.site_content;
CREATE TRIGGER site_content_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Seed defaults (idempotent)
INSERT INTO public.site_content (key, value) VALUES
  ('hero.line1', to_jsonb('Baltimore is'::text)),
  ('hero.line2', to_jsonb('extraordinary'::text)),
  ('hero.subtitle', to_jsonb('We all deserve to experience more of it.'::text)),
  ('hero.cta', to_jsonb('Get Started'::text)),
  ('quote.text', to_jsonb('Planet Baltimore provides a space for artists to sustain ourselves by connecting us directly to our own communities.'::text)),
  ('quote.author', to_jsonb('Terrell Speaks'::text))
ON CONFLICT (key) DO NOTHING;

-- 3) events lat/lng for map pins
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- 4) Realtime for notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $$;
