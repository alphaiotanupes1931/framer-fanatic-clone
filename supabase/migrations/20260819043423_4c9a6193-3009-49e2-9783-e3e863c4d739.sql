CREATE TABLE public.neighborhood_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  neighborhood TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, neighborhood)
);

GRANT SELECT, INSERT, DELETE ON public.neighborhood_follows TO authenticated;
GRANT ALL ON public.neighborhood_follows TO service_role;

ALTER TABLE public.neighborhood_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Neighborhood follows are viewable by signed in users"
  ON public.neighborhood_follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can follow neighborhoods for themselves"
  ON public.neighborhood_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow their own neighborhoods"
  ON public.neighborhood_follows FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_neighborhood_follows_user ON public.neighborhood_follows (user_id);
CREATE INDEX idx_neighborhood_follows_hood ON public.neighborhood_follows (neighborhood);