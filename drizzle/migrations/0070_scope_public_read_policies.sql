DROP POLICY IF EXISTS "Episodes are viewable by everyone" ON public.podcast_episodes;
CREATE POLICY "Episodes viewable when creator is visible" ON public.podcast_episodes FOR SELECT
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = podcast_episodes.user_id));

DROP POLICY IF EXISTS "Festival details are publicly readable" ON public.festival_details;
CREATE POLICY "Festival details viewable with visible event" ON public.festival_details FOR SELECT
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = festival_details.event_id));

DROP POLICY IF EXISTS "Anyone can view ticket types" ON public.ticket_types;
CREATE POLICY "Ticket types viewable with visible event" ON public.ticket_types FOR SELECT
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = ticket_types.event_id));

DROP POLICY IF EXISTS "Poll options viewable by everyone" ON public.organization_poll_options;
CREATE POLICY "Poll options viewable with visible poll" ON public.organization_poll_options FOR SELECT
USING (EXISTS (SELECT 1 FROM public.organization_polls p WHERE p.id = organization_poll_options.poll_id));

DROP POLICY IF EXISTS "videos viewable" ON public.videos;
CREATE POLICY "videos viewable when visible" ON public.videos FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (deleted_at IS NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = videos.user_id)));