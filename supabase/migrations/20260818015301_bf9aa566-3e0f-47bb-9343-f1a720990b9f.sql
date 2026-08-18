
CREATE TABLE IF NOT EXISTS public.event_likes (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.event_likes TO authenticated;
GRANT SELECT ON public.event_likes TO anon;
GRANT ALL ON public.event_likes TO service_role;
ALTER TABLE public.event_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_likes read" ON public.event_likes FOR SELECT USING (true);
CREATE POLICY "event_likes insert own" ON public.event_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "event_likes delete own" ON public.event_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.event_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_comments_event_idx ON public.event_comments(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS event_likes_event_idx ON public.event_likes(event_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_comments TO authenticated;
GRANT SELECT ON public.event_comments TO anon;
GRANT ALL ON public.event_comments TO service_role;
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_comments read" ON public.event_comments FOR SELECT USING (true);
CREATE POLICY "event_comments insert own" ON public.event_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "event_comments update own" ON public.event_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "event_comments delete own or host" ON public.event_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.verify_ticket(_ticket_id uuid)
RETURNS TABLE(
  ticket_id uuid, status text, checked_in_at timestamptz, created_at timestamptz,
  paid_cents integer,
  event_id uuid, event_title text, starts_at timestamptz, ends_at timestamptz,
  venue_name text, address text, location text, image_url text,
  holder_name text, holder_email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.status, t.checked_in_at, t.created_at, t.buyer_total_cents,
         e.id, e.title, e.starts_at, e.ends_at, e.venue_name, e.address, e.location, e.image_url,
         p.display_name, p.email
  FROM public.tickets t
  LEFT JOIN public.events e ON e.id = t.event_id
  LEFT JOIN public.profiles p ON p.id = t.buyer_id
  WHERE t.id = _ticket_id
$$;
REVOKE ALL ON FUNCTION public.verify_ticket(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_ticket(uuid) TO anon, authenticated, service_role;
