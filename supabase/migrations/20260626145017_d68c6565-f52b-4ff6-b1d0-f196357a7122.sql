
CREATE TABLE public.post_saves (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX post_saves_user_created_idx ON public.post_saves (user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.post_saves TO authenticated;
GRANT ALL ON public.post_saves TO service_role;

ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own saves" ON public.post_saves
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own saves" ON public.post_saves
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own saves" ON public.post_saves
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
