ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

CREATE INDEX IF NOT EXISTS organizations_pinned_idx ON public.organizations (pinned, pinned_at DESC);

CREATE OR REPLACE FUNCTION public.admin_set_org_pinned(_org_id uuid, _pinned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.organizations
     SET pinned = _pinned,
         pinned_at = CASE WHEN _pinned THEN now() ELSE NULL END,
         updated_at = now()
   WHERE id = _org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_org_pinned(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_org_pinned(uuid, boolean) TO authenticated, service_role;

UPDATE public.organizations SET pinned = true, pinned_at = now() WHERE slug = 'start-here-izbp';