CREATE OR REPLACE FUNCTION public.rsvp_free_event(_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  event_row public.events%ROWTYPE;
  existing_ticket_id uuid;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to RSVP';
  END IF;

  SELECT * INTO event_row
  FROM public.events
  WHERE id = _event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF event_row.is_published IS FALSE THEN
    RAISE EXCEPTION 'Event is not available';
  END IF;

  IF COALESCE(event_row.price_cents, 0) > 0 THEN
    RAISE EXCEPTION 'This event requires a paid ticket';
  END IF;

  SELECT id INTO existing_ticket_id
  FROM public.tickets
  WHERE event_id = _event_id AND buyer_id = caller_id
  LIMIT 1;

  IF existing_ticket_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'alreadyRsvped', true, 'ticketId', existing_ticket_id);
  END IF;

  INSERT INTO public.tickets (
    event_id,
    buyer_id,
    artist_id,
    buyer_total_cents,
    artist_net_cents,
    platform_tax_cents,
    stripe_fee_cents,
    status
  ) VALUES (
    event_row.id,
    caller_id,
    event_row.user_id,
    0,
    0,
    0,
    0,
    'paid'
  )
  RETURNING id INTO existing_ticket_id;

  RETURN jsonb_build_object('ok', true, 'alreadyRsvped', false, 'ticketId', existing_ticket_id);
END;
$$;

REVOKE ALL ON FUNCTION public.rsvp_free_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsvp_free_event(uuid) TO authenticated;