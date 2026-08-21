CREATE OR REPLACE FUNCTION public.check_in_ticket(_ticket_id uuid)
RETURNS TABLE(ok boolean, checked_in_at timestamp with time zone, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE t public.tickets%ROWTYPE;
BEGIN
  SELECT * INTO t FROM public.tickets WHERE id = _ticket_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::timestamptz, 'Ticket not found';
    RETURN;
  END IF;
  IF t.status = 'cancelled' THEN
    RETURN QUERY SELECT false, t.checked_in_at, 'This ticket was cancelled';
    RETURN;
  END IF;
  IF t.status = 'refunded' THEN
    RETURN QUERY SELECT false, t.checked_in_at, 'This ticket was refunded';
    RETURN;
  END IF;
  IF t.checked_in_at IS NOT NULL THEN
    RETURN QUERY SELECT false, t.checked_in_at, 'Already checked in';
    RETURN;
  END IF;
  UPDATE public.tickets SET checked_in_at = now() WHERE id = _ticket_id RETURNING tickets.checked_in_at INTO t.checked_in_at;
  RETURN QUERY SELECT true, t.checked_in_at, 'Checked in';
END;
$$;