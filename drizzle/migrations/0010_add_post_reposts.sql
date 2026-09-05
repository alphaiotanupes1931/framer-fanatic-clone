ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS repost_of_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS repost_of_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_repost_of_post_id_idx ON public.posts(repost_of_post_id);
CREATE INDEX IF NOT EXISTS posts_repost_of_event_id_idx ON public.posts(repost_of_event_id);