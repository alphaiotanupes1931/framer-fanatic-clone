-- One checkout session can reserve several seats; drop the unique restriction.
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_stripe_checkout_session_id_key;
DROP INDEX IF EXISTS public.tickets_stripe_checkout_session_id_key;
CREATE INDEX IF NOT EXISTS tickets_checkout_session_idx ON public.tickets (stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS tickets_buyer_event_idx ON public.tickets (buyer_id, event_id);

-- Free RSVP with quantity + per-buyer limits set by the organizer.
CREATE OR REPLACE FUNCTION public.rsvp_free_event(_event_id uuid, _quantity integer DEFAULT 1, _ticket_type_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _ev record;
  _tt record;
  _qty int := greatest(1, coalesce(_quantity, 1));
  _existing int;
  _sold int;
  _ids uuid[] := '{}';
  _new_id uuid;
  i int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to RSVP.';
  END IF;

  SELECT id, user_id, price_cents, is_published INTO _ev FROM public.events WHERE id = _event_id;
  IF _ev.id IS NULL THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;

  IF _ticket_type_id IS NOT NULL THEN
    SELECT id, name, price_cents, quantity, max_per_buyer, event_id
      INTO _tt FROM public.ticket_types WHERE id = _ticket_type_id;
    IF _tt.id IS NULL OR _tt.event_id <> _event_id THEN
      RAISE EXCEPTION 'Ticket type not found for this event.';
    END IF;
    IF coalesce(_tt.price_cents, 0) > 0 THEN
      RAISE EXCEPTION 'This ticket type is not free.';
    END IF;
  ELSIF coalesce(_ev.price_cents, 0) > 0 THEN
    RAISE EXCEPTION 'This event requires payment.';
  END IF;

  -- Organizer-set per-person limit
  IF _tt.max_per_buyer IS NOT NULL THEN
    SELECT count(*) INTO _existing FROM public.tickets
      WHERE event_id = _event_id AND buyer_id = _uid AND status <> 'cancelled'
        AND ticket_type_id IS NOT DISTINCT FROM _ticket_type_id;
    IF _existing + _qty > _tt.max_per_buyer THEN
      RAISE EXCEPTION 'You can reserve at most % of this ticket.', _tt.max_per_buyer;
    END IF;
  END IF;

  -- Remaining inventory
  IF _tt.quantity IS NOT NULL THEN
    SELECT count(*) INTO _sold FROM public.tickets
      WHERE ticket_type_id = _tt.id AND status <> 'cancelled';
    IF _sold + _qty > _tt.quantity THEN
      RAISE EXCEPTION 'Not enough tickets left.';
    END IF;
  END IF;

  FOR i IN 1.._qty LOOP
    INSERT INTO public.tickets (event_id, buyer_id, artist_id, status, buyer_total_cents,
                                artist_net_cents, platform_tax_cents, stripe_fee_cents,
                                ticket_type_id, ticket_type_name)
    VALUES (_event_id, _uid, _ev.user_id, 'paid', 0, 0, 0, 0, _tt.id, _tt.name)
    RETURNING id INTO _new_id;
    _ids := _ids || _new_id;
  END LOOP;

  RETURN jsonb_build_object('ticket_ids', to_jsonb(_ids), 'quantity', _qty, 'ticket_id', _ids[1]);
END;
$$;

REVOKE ALL ON FUNCTION public.rsvp_free_event(uuid, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rsvp_free_event(uuid, integer, uuid) TO authenticated;