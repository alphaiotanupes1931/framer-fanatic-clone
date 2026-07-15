
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_events_organization_id ON public.events(organization_id);

-- Loosen insert policy: allow event creation for self OR when tied to an org the user owns
DROP POLICY IF EXISTS "Only artists can create events" ON public.events;
CREATE POLICY "Users create own or org events"
  ON public.events FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      organization_id IS NULL
      OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Only artists can update their events" ON public.events;
CREATE POLICY "Users update own events"
  ON public.events FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "users delete their events" ON public.events;
CREATE POLICY "Users delete own or org events"
  ON public.events FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid())
  );
