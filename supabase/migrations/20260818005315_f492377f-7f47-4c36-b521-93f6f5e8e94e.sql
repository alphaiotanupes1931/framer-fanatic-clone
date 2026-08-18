ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS requested_at timestamptz NOT NULL DEFAULT now();

CREATE POLICY "org owners manage members" ON public.organization_members
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid()));

CREATE POLICY "org owners remove members" ON public.organization_members
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.notify_group_join_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE owner uuid;
BEGIN
  IF NEW.status = 'pending' THEN
    SELECT o.owner_id INTO owner FROM public.organizations o WHERE o.id = NEW.organization_id;
    IF owner IS NOT NULL AND owner <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type, target_id)
      VALUES (owner, NEW.user_id, 'group_join_request', NEW.organization_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_group_join_request ON public.organization_members;
CREATE TRIGGER trg_notify_group_join_request
AFTER INSERT ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.notify_group_join_request();