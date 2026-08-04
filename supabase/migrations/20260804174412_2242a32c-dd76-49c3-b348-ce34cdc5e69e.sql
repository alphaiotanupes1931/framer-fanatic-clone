ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_in_by uuid;

CREATE INDEX IF NOT EXISTS tickets_event_checked_in_idx ON public.tickets (event_id, checked_in_at);

DROP POLICY IF EXISTS "Hosts can update check-in on their event tickets" ON public.tickets;
CREATE POLICY "Hosts can update check-in on their event tickets"
ON public.tickets FOR UPDATE TO authenticated
USING (
  auth.uid() = artist_id
  OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = tickets.event_id AND e.user_id = auth.uid())
)
WITH CHECK (
  auth.uid() = artist_id
  OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = tickets.event_id AND e.user_id = auth.uid())
);