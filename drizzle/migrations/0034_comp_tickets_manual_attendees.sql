ALTER TABLE public.tickets ALTER COLUMN buyer_id DROP NOT NULL;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS is_comp boolean NOT NULL DEFAULT false;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ticket_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.verify_ticket(_ticket_id uuid)
 RETURNS TABLE(ticket_id uuid, status text, checked_in_at timestamp with time zone, created_at timestamp with time zone, paid_cents integer, event_id uuid, event_title text, starts_at timestamp with time zone, ends_at timestamp with time zone, venue_name text, address text, location text, image_url text, holder_name text, holder_email text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT t.id, t.status, t.checked_in_at, t.created_at, t.buyer_total_cents,
         e.id, e.title, e.starts_at, e.ends_at, e.venue_name, e.address, e.location, e.image_url,
         COALESCE(t.guest_name, p.display_name), COALESCE(t.guest_email, p.email)
  FROM public.tickets t
  LEFT JOIN public.events e ON e.id = t.event_id
  LEFT JOIN public.profiles p ON p.id = t.buyer_id
  WHERE t.id = _ticket_id
$function$;