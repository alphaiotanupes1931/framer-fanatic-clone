
-- 1. Ephemeral stories table (24-hour Story bar)
CREATE TABLE public.ephemeral_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX ephemeral_stories_user_created_idx ON public.ephemeral_stories (user_id, created_at DESC);
CREATE INDEX ephemeral_stories_expires_idx ON public.ephemeral_stories (expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ephemeral_stories TO authenticated;
GRANT ALL ON public.ephemeral_stories TO service_role;

ALTER TABLE public.ephemeral_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view non-expired stories"
  ON public.ephemeral_stories FOR SELECT
  TO authenticated
  USING (expires_at > now());

CREATE POLICY "Users can create their own stories"
  ON public.ephemeral_stories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories"
  ON public.ephemeral_stories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
  ON public.ephemeral_stories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Soft-delete flag on posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS posts_not_deleted_created_idx
  ON public.posts (created_at DESC)
  WHERE is_deleted = false;

-- 3. Status columns on stories and events
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'upcoming';

-- 4. Multi-neighborhood on profiles, backfilled from the single neighborhood
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS neighborhood_names text[] NOT NULL DEFAULT '{}';

UPDATE public.profiles
SET neighborhood_names = ARRAY[neighborhood]
WHERE neighborhood IS NOT NULL
  AND length(btrim(neighborhood)) > 0
  AND (neighborhood_names IS NULL OR array_length(neighborhood_names, 1) IS NULL);
