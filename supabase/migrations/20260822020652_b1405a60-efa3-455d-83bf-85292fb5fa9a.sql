CREATE TABLE public.share_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID NOT NULL,
  share_url TEXT,
  share_title TEXT,
  share_kind TEXT,
  is_retry BOOLEAN NOT NULL DEFAULT false,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  failure_reasons TEXT[] NOT NULL DEFAULT '{}',
  outcome TEXT NOT NULL DEFAULT 'attempt',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.share_events TO authenticated;
GRANT ALL ON public.share_events TO service_role;

ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own share events" ON public.share_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);

CREATE POLICY "Users read their own share events" ON public.share_events
  FOR SELECT TO authenticated USING (auth.uid() = actor_id);

CREATE POLICY "Admins read all share events" ON public.share_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX share_events_actor_created_idx ON public.share_events (actor_id, created_at DESC);
CREATE INDEX share_events_outcome_created_idx ON public.share_events (outcome, created_at DESC);