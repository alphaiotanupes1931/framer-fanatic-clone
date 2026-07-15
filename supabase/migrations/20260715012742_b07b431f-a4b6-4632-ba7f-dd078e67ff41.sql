
CREATE TABLE public.story_saves (
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.story_saves TO authenticated;
GRANT ALL ON public.story_saves TO service_role;
ALTER TABLE public.story_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own story saves select" ON public.story_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own story saves insert" ON public.story_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own story saves delete" ON public.story_saves FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.event_saves (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.event_saves TO authenticated;
GRANT ALL ON public.event_saves TO service_role;
ALTER TABLE public.event_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own event saves select" ON public.event_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own event saves insert" ON public.event_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own event saves delete" ON public.event_saves FOR DELETE USING (auth.uid() = user_id);
