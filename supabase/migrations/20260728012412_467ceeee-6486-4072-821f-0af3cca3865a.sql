GRANT SELECT, INSERT, DELETE ON public.post_saves TO authenticated;
GRANT ALL ON public.post_saves TO service_role;
GRANT SELECT, INSERT, DELETE ON public.story_saves TO authenticated;
GRANT ALL ON public.story_saves TO service_role;
GRANT SELECT, INSERT, DELETE ON public.event_saves TO authenticated;
GRANT ALL ON public.event_saves TO service_role;