
ALTER TABLE public.profile_sections
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.profile_sections(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS profile_sections_parent_idx ON public.profile_sections(parent_id);

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS tag TEXT;
