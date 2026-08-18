ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS link_title text,
  ADD COLUMN IF NOT EXISTS link_description text;