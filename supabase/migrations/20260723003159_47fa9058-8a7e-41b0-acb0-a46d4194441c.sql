
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_posts_featured ON public.posts(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_stories_featured ON public.stories(featured) WHERE featured = true;

DROP POLICY IF EXISTS "admins update any post" ON public.posts;
CREATE POLICY "admins update any post" ON public.posts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admins update any story" ON public.stories;
CREATE POLICY "admins update any story" ON public.stories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
