
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.podcast_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT,
  video_url TEXT,
  cover_url TEXT,
  episode_number INT,
  duration_seconds INT,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.podcast_episodes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.podcast_episodes TO authenticated;
GRANT ALL ON public.podcast_episodes TO service_role;

ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Episodes are viewable by everyone"
  ON public.podcast_episodes FOR SELECT USING (true);

CREATE POLICY "Users manage their own episodes"
  ON public.podcast_episodes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_podcast_episodes_updated_at
  BEFORE UPDATE ON public.podcast_episodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_podcast_episodes_user ON public.podcast_episodes(user_id, published_at DESC);
