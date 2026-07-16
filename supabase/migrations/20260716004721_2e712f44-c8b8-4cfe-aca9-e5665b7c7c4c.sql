ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS pin_order integer;
CREATE INDEX IF NOT EXISTS posts_user_pin_idx ON public.posts(user_id, pin_order) WHERE is_pinned = true;