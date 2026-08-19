CREATE TABLE public.organization_staff_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  username text NOT NULL,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  created_by uuid,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX organization_staff_logins_username_key
  ON public.organization_staff_logins (lower(username));
CREATE INDEX organization_staff_logins_org_idx
  ON public.organization_staff_logins (organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_staff_logins TO authenticated;
GRANT ALL ON public.organization_staff_logins TO service_role;

ALTER TABLE public.organization_staff_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view staff logins"
  ON public.organization_staff_logins FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Owners delete staff logins"
  ON public.organization_staff_logins FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER organization_staff_logins_updated_at
  BEFORE UPDATE ON public.organization_staff_logins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();