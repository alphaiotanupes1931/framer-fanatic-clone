-- UI preferences (per-user dismissals persisted across devices/logins)
CREATE TABLE IF NOT EXISTS public.user_ui_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_dismissed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ui_prefs TO authenticated;
GRANT ALL ON public.user_ui_prefs TO service_role;
ALTER TABLE public.user_ui_prefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own ui prefs" ON public.user_ui_prefs;
CREATE POLICY "own ui prefs" ON public.user_ui_prefs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Videos: comment muting by the owner
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS comments_muted BOOLEAN NOT NULL DEFAULT false;

-- Video likes
CREATE TABLE IF NOT EXISTS public.video_likes (
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.video_likes TO authenticated;
GRANT SELECT ON public.video_likes TO anon;
GRANT ALL ON public.video_likes TO service_role;
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "video likes readable" ON public.video_likes;
CREATE POLICY "video likes readable" ON public.video_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "own video like insert" ON public.video_likes;
CREATE POLICY "own video like insert" ON public.video_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own video like delete" ON public.video_likes;
CREATE POLICY "own video like delete" ON public.video_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Video comments
CREATE TABLE IF NOT EXISTS public.video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS video_comments_video_idx ON public.video_comments(video_id, created_at DESC);
CREATE INDEX IF NOT EXISTS video_likes_video_idx ON public.video_likes(video_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_comments TO authenticated;
GRANT SELECT ON public.video_comments TO anon;
GRANT ALL ON public.video_comments TO service_role;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "video comments readable" ON public.video_comments;
CREATE POLICY "video comments readable" ON public.video_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "video comment insert" ON public.video_comments;
CREATE POLICY "video comment insert" ON public.video_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND (v.comments_muted = false OR v.user_id = auth.uid()))
  );
DROP POLICY IF EXISTS "video comment delete" ON public.video_comments;
CREATE POLICY "video comment delete" ON public.video_comments FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );