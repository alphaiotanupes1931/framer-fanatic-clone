
-- 1) Extend posts with type/media/style/category/visibility
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS music_url text,
  ADD COLUMN IF NOT EXISTS bg_color text,
  ADD COLUMN IF NOT EXISTS text_color text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS excluded_user_ids uuid[] NOT NULL DEFAULT '{}';

-- Ensure post_type / visibility allowed values via trigger (avoids CHECK on existing data)
CREATE OR REPLACE FUNCTION public.posts_validate_type_visibility()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.post_type NOT IN ('text','photo','video','music') THEN
    RAISE EXCEPTION 'invalid post_type %', NEW.post_type;
  END IF;
  IF NEW.visibility NOT IN ('public','followers','close_friends','only_me') THEN
    RAISE EXCEPTION 'invalid visibility %', NEW.visibility;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS posts_validate_type_visibility_trg ON public.posts;
CREATE TRIGGER posts_validate_type_visibility_trg
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.posts_validate_type_visibility();

-- 2) Close-friends list per user
CREATE TABLE IF NOT EXISTS public.close_friends (
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id)
);
GRANT SELECT, INSERT, DELETE ON public.close_friends TO authenticated;
GRANT ALL ON public.close_friends TO service_role;
ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own close friends read" ON public.close_friends;
CREATE POLICY "own close friends read" ON public.close_friends FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own close friends write" ON public.close_friends;
CREATE POLICY "own close friends write" ON public.close_friends FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own close friends delete" ON public.close_friends;
CREATE POLICY "own close friends delete" ON public.close_friends FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3) Broaden top_creators to fill with any public profile if not enough artists
CREATE OR REPLACE FUNCTION public.top_creators(lim integer DEFAULT 3)
RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, category text, role text, score bigint, is_founder boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH candidates AS (
    SELECT p.id, p.display_name, p.username, p.avatar_url, p.category, p.role, p.is_founder, p.created_at,
           CASE WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role='artist')
                THEN 1 ELSE 0 END AS is_artist
    FROM public.profiles p
    WHERE COALESCE(p.banned,false)=false
      AND COALESCE(p.hidden_from_showcase,false)=false
      AND p.avatar_url IS NOT NULL
      AND COALESCE(p.display_name, p.username) IS NOT NULL
  ),
  post_engagement AS (
    SELECT user_id, SUM(COALESCE(likes_count,0) + COALESCE(comments_count,0))::bigint AS s
    FROM public.posts GROUP BY user_id
  ),
  follower_counts AS (
    SELECT following_id AS user_id, COUNT(*)::bigint AS s
    FROM public.follows GROUP BY following_id
  )
  SELECT c.id, COALESCE(c.display_name, c.username), c.username, c.avatar_url, c.category, c.role,
         (COALESCE(pe.s,0) + COALESCE(fc.s,0))::bigint AS score,
         COALESCE(c.is_founder, false) AS is_founder
  FROM candidates c
  LEFT JOIN post_engagement pe ON pe.user_id = c.id
  LEFT JOIN follower_counts fc ON fc.user_id = c.id
  ORDER BY c.is_artist DESC, score DESC, c.created_at DESC NULLS LAST, c.id
  LIMIT GREATEST(1, LEAST(lim, 50));
$$;

-- 4) Public rotating stories helper (small payload, includes author)
CREATE OR REPLACE FUNCTION public.public_rotating_stories(lim integer DEFAULT 12)
RETURNS TABLE(id uuid, title text, excerpt text, cover_url text, author_name text, author_username text, author_avatar text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.title, s.excerpt, s.cover_url,
         COALESCE(p.display_name, p.username) AS author_name,
         p.username, p.avatar_url, s.created_at
  FROM public.stories s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  WHERE COALESCE(s.status, 'published') = 'published'
  ORDER BY s.created_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(lim, 50));
$$;
