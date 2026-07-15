CREATE TABLE public.profile_wall_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pwc_profile ON public.profile_wall_comments(profile_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.profile_wall_comments TO authenticated;
GRANT SELECT ON public.profile_wall_comments TO anon;
GRANT ALL ON public.profile_wall_comments TO service_role;

ALTER TABLE public.profile_wall_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wall comments are public" ON public.profile_wall_comments
  FOR SELECT USING (true);
CREATE POLICY "Auth users can post" ON public.profile_wall_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Author or profile owner can delete" ON public.profile_wall_comments
  FOR DELETE TO authenticated USING (auth.uid() = author_id OR auth.uid() = profile_id);