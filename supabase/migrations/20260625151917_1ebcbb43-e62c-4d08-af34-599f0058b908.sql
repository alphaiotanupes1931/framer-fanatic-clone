
CREATE TABLE public.story_likes (
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.story_likes TO authenticated;
GRANT SELECT ON public.story_likes TO anon;
GRANT ALL ON public.story_likes TO service_role;
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "story_likes read" ON public.story_likes FOR SELECT USING (true);
CREATE POLICY "story_likes insert own" ON public.story_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "story_likes delete own" ON public.story_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.story_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_comments TO authenticated;
GRANT SELECT ON public.story_comments TO anon;
GRANT ALL ON public.story_comments TO service_role;
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "story_comments read" ON public.story_comments FOR SELECT USING (true);
CREATE POLICY "story_comments insert own" ON public.story_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "story_comments update own" ON public.story_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "story_comments delete own" ON public.story_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.bump_story_likes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.stories SET likes_count = COALESCE(likes_count,0) + 1 WHERE id = NEW.story_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.stories SET likes_count = GREATEST(COALESCE(likes_count,0) - 1, 0) WHERE id = OLD.story_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER story_likes_count_trg
AFTER INSERT OR DELETE ON public.story_likes
FOR EACH ROW EXECUTE FUNCTION public.bump_story_likes();

CREATE OR REPLACE FUNCTION public.bump_story_comments()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.stories SET comments_count = COALESCE(comments_count,0) + 1 WHERE id = NEW.story_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.stories SET comments_count = GREATEST(COALESCE(comments_count,0) - 1, 0) WHERE id = OLD.story_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER story_comments_count_trg
AFTER INSERT OR DELETE ON public.story_comments
FOR EACH ROW EXECUTE FUNCTION public.bump_story_comments();
