CREATE OR REPLACE FUNCTION public.rsvp_free_event(_event_id uuid, _quantity integer DEFAULT 1, _ticket_type_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _ev record;
  _tt_id uuid;
  _tt_name text;
  _tt_price int;
  _tt_qty int;
  _tt_max int;
  _tt_event uuid;
  _qty int := greatest(1, coalesce(_quantity, 1));
  _sold int;
  _cap int;
  _event_sold int;
  _ids uuid[] := '{}';
  _new_id uuid;
  i int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to RSVP.';
  END IF;

  SELECT id, user_id, price_cents, is_published, max_tickets_per_buyer, capacity INTO _ev
    FROM public.events WHERE id = _event_id;
  IF _ev.id IS NULL THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;

  IF _ticket_type_id IS NOT NULL THEN
    SELECT id, name, price_cents, quantity, max_per_buyer, event_id
      INTO _tt_id, _tt_name, _tt_price, _tt_qty, _tt_max, _tt_event
      FROM public.ticket_types WHERE id = _ticket_type_id;
    IF _tt_id IS NULL OR _tt_event <> _event_id THEN
      RAISE EXCEPTION 'Ticket type not found for this event.';
    END IF;
    IF coalesce(_tt_price, 0) > 0 THEN
      RAISE EXCEPTION 'This ticket type is not free.';
    END IF;
  ELSIF coalesce(_ev.price_cents, 0) > 0 THEN
    RAISE EXCEPTION 'This event requires payment.';
  END IF;

  IF _ev.capacity IS NOT NULL AND _ev.capacity > 0 THEN
    SELECT count(*) INTO _event_sold FROM public.tickets
      WHERE event_id = _event_id AND status <> 'cancelled' AND status <> 'refunded';
    IF _event_sold + _qty > _ev.capacity THEN
      IF _event_sold >= _ev.capacity THEN
        RAISE EXCEPTION 'This event is sold out.';
      END IF;
      RAISE EXCEPTION 'Only % ticket(s) left for this event.', _ev.capacity - _event_sold;
    END IF;
  END IF;

  -- Order limit: the most tickets allowed in a SINGLE order. Tickets the guest
  -- already holds for this or any other event are deliberately NOT counted.
  _cap := coalesce(_tt_max, _ev.max_tickets_per_buyer);
  IF _cap IS NOT NULL AND _qty > _cap THEN
    RAISE EXCEPTION 'The organizer limits this to % ticket(s) per order.', _cap;
  END IF;

  IF _tt_qty IS NOT NULL THEN
    SELECT count(*) INTO _sold FROM public.tickets
      WHERE ticket_type_id = _tt_id AND status <> 'cancelled' AND status <> 'refunded';
    IF _sold + _qty > _tt_qty THEN
      RAISE EXCEPTION 'Not enough tickets left.';
    END IF;
  END IF;

  FOR i IN 1.._qty LOOP
    INSERT INTO public.tickets (event_id, buyer_id, artist_id, status, buyer_total_cents,
                                artist_net_cents, platform_tax_cents, stripe_fee_cents,
                                ticket_type_id, ticket_type_name)
    VALUES (_event_id, _uid, _ev.user_id, 'paid', 0, 0, 0, 0, _tt_id, _tt_name)
    RETURNING id INTO _new_id;
    _ids := _ids || _new_id;
  END LOOP;

  RETURN jsonb_build_object('ticket_ids', to_jsonb(_ids), 'quantity', _qty, 'ticket_id', _ids[1]);
END;
$$;