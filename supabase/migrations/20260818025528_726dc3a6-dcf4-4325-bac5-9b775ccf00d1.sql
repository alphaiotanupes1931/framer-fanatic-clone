GRANT SELECT ON public.stories TO anon;
CREATE POLICY "anon can read published public stories" ON public.stories
FOR SELECT TO anon
USING (status = 'published' AND visibility = 'public');