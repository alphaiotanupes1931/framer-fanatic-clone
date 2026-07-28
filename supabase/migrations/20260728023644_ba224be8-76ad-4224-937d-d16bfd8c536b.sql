CREATE TABLE public.video_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);
GRANT SELECT, INSERT, DELETE ON public.video_saves TO authenticated;
GRANT ALL ON public.video_saves TO service_role;
ALTER TABLE public.video_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own video saves select" ON public.video_saves FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own video saves insert" ON public.video_saves FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own video saves delete" ON public.video_saves FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX video_saves_user_idx ON public.video_saves(user_id, created_at DESC);
CREATE INDEX video_saves_video_idx ON public.video_saves(video_id);