ALTER TABLE public.events ADD COLUMN IF NOT EXISTS category text;
CREATE INDEX IF NOT EXISTS events_category_idx ON public.events (category);