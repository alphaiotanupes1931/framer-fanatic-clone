ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.stories
  DROP CONSTRAINT IF EXISTS stories_visibility_check;
ALTER TABLE public.stories
  ADD CONSTRAINT stories_visibility_check CHECK (visibility IN ('public','followers','only_me'));

DROP TRIGGER IF EXISTS stories_set_updated_at ON public.stories;
CREATE TRIGGER stories_set_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();