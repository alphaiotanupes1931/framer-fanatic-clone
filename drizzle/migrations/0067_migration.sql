-- Stories: drafts/non-public only visible to author or admin
DROP POLICY IF EXISTS "stories viewable" ON public.stories;
CREATE POLICY "stories viewable" ON public.stories FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role)
  OR (status = 'published' AND visibility = 'public' AND deleted_at IS NULL));

-- Likes/comments only visible when the parent item is visible to the caller (parent RLS applies)
DROP POLICY IF EXISTS "post_likes read" ON public.post_likes;
CREATE POLICY "post_likes read" ON public.post_likes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_likes.post_id));
DROP POLICY IF EXISTS "post_comments read" ON public.post_comments;
CREATE POLICY "post_comments read" ON public.post_comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_comments.post_id));

DROP POLICY IF EXISTS "story_likes read" ON public.story_likes;
CREATE POLICY "story_likes read" ON public.story_likes FOR SELECT
USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_likes.story_id));
DROP POLICY IF EXISTS "story_comments read" ON public.story_comments;
CREATE POLICY "story_comments read" ON public.story_comments FOR SELECT
USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_comments.story_id));

DROP POLICY IF EXISTS "event_likes read" ON public.event_likes;
CREATE POLICY "event_likes read" ON public.event_likes FOR SELECT
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_likes.event_id));
DROP POLICY IF EXISTS "event_comments read" ON public.event_comments;
CREATE POLICY "event_comments read" ON public.event_comments FOR SELECT
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_comments.event_id));

DROP POLICY IF EXISTS "video comments readable" ON public.video_comments;
CREATE POLICY "video comments readable" ON public.video_comments FOR SELECT
USING (EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_comments.video_id));

DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.organization_comment_likes;
CREATE POLICY "Anyone can view comment likes" ON public.organization_comment_likes FOR SELECT
USING (EXISTS (SELECT 1 FROM public.organization_comments c WHERE c.id = organization_comment_likes.comment_id));

-- Profile content only for visible (non-banned, non-hidden) profiles, owner or admin
DROP POLICY IF EXISTS "ps read all" ON public.profile_sections;
CREATE POLICY "ps read all" ON public.profile_sections FOR SELECT
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = profile_sections.user_id));
DROP POLICY IF EXISTS "Wall comments are public" ON public.profile_wall_comments;
CREATE POLICY "Wall comments are public" ON public.profile_wall_comments FOR SELECT
USING (auth.uid() = author_id OR auth.uid() = profile_id
  OR EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = profile_wall_comments.profile_id));

-- Follow graphs: caller's own rows, or rows between visible profiles
DROP POLICY IF EXISTS "follows viewable" ON public.follows;
CREATE POLICY "follows viewable" ON public.follows FOR SELECT TO authenticated
USING (auth.uid() = follower_id OR auth.uid() = following_id
  OR (EXISTS (SELECT 1 FROM public.profiles a WHERE a.id = follows.follower_id)
      AND EXISTS (SELECT 1 FROM public.profiles b WHERE b.id = follows.following_id)));
DROP POLICY IF EXISTS "Neighborhood follows are viewable by signed in users" ON public.neighborhood_follows;
CREATE POLICY "Neighborhood follows are viewable by signed in users" ON public.neighborhood_follows FOR SELECT TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = neighborhood_follows.user_id));