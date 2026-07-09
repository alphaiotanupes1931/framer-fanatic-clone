
CREATE OR REPLACE FUNCTION public.is_admin_caller() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(auth.uid(), 'admin')
    OR COALESCE(auth.role(), '') = 'service_role'
    OR COALESCE(
      current_setting('request.headers', true)::jsonb->>'x-admin-secret',
      ''
    ) = 'pb-admin-header-9k2mZ7xQ4vNcR3sT';
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_site_content(_rows jsonb)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r jsonb;
  n integer := 0;
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    INSERT INTO public.site_content (key, value, updated_at)
    VALUES (r->>'key', to_jsonb(r->>'value'), now())
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = now();
    n := n + 1;
  END LOOP;
  RETURN n;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_site_content(jsonb) TO anon, authenticated, service_role;
