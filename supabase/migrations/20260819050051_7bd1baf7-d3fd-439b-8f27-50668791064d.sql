CREATE OR REPLACE FUNCTION public.cancel_my_rsvp(_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.tickets%ROWTYPE;
  ev public.events%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO t FROM public.tickets WHERE id = _ticket_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  IF t.buyer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only cancel your own RSVP';
  END IF;

  IF COALESCE(t.buyer_total_cents, 0) > 0 THEN
    RAISE EXCEPTION 'Paid tickets cannot be cancelled here. Contact the event host.';
  END IF;

  IF t.checked_in_at IS NOT NULL THEN
    RAISE EXCEPTION 'This ticket has already been checked in';
  END IF;

  IF t.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  SELECT * INTO ev FROM public.events WHERE id = t.event_id;
  IF FOUND AND ev.starts_at IS NOT NULL AND ev.starts_at < now() THEN
    RAISE EXCEPTION 'This event has already started';
  END IF;

  UPDATE public.tickets SET status = 'cancelled' WHERE id = _ticket_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_my_rsvp(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_rsvp(uuid) TO authenticated;