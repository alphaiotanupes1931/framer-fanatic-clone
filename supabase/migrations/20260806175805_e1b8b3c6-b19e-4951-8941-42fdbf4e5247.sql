CREATE TABLE IF NOT EXISTS public.stripe_event_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'webhook',
  event_type text NOT NULL,
  event_id text,
  status text NOT NULL DEFAULT 'ok',
  message text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.stripe_event_logs TO service_role;

ALTER TABLE public.stripe_event_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS stripe_event_logs_created_at_idx ON public.stripe_event_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS stripe_event_logs_status_idx ON public.stripe_event_logs (status);

CREATE OR REPLACE FUNCTION public.admin_list_stripe_logs(_limit integer DEFAULT 200, _status text DEFAULT NULL)
RETURNS TABLE(id uuid, source text, event_type text, event_id text, status text, message text, details jsonb, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT l.id, l.source, l.event_type, l.event_id, l.status, l.message, l.details, l.created_at
  FROM public.stripe_event_logs l
  WHERE public.is_admin_caller()
    AND (_status IS NULL OR _status = '' OR l.status = _status)
  ORDER BY l.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 200), 1000));
$$;

CREATE OR REPLACE FUNCTION public.admin_clear_stripe_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.stripe_event_logs;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;