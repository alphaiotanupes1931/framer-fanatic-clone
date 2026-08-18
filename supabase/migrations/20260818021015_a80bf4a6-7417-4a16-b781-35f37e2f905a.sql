ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS ticket_type_id uuid REFERENCES public.ticket_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ticket_type_name text;

CREATE INDEX IF NOT EXISTS tickets_ticket_type_id_idx ON public.tickets(ticket_type_id);