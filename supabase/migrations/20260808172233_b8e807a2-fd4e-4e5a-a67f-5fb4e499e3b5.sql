GRANT SELECT ON public.videos TO anon;
CREATE POLICY "videos publicly viewable" ON public.videos FOR SELECT TO anon USING (true);