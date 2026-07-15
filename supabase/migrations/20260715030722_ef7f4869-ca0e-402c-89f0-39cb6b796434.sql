DROP POLICY IF EXISTS "Artists create own posts" ON public.posts;
CREATE POLICY "Users create own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);