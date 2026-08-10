ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS orientation text,
  ADD COLUMN IF NOT EXISTS aspect_ratio numeric;

ALTER TABLE public.videos
  DROP CONSTRAINT IF EXISTS videos_orientation_check;

ALTER TABLE public.videos
  ADD CONSTRAINT videos_orientation_check
  CHECK (orientation IS NULL OR orientation IN ('portrait','landscape'));

UPDATE public.videos SET orientation = 'landscape' WHERE orientation IS NULL;