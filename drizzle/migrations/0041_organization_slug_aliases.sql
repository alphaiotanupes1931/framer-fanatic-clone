CREATE TABLE public.organization_slug_aliases (
  old_slug text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.organization_slug_aliases TO service_role;
ALTER TABLE public.organization_slug_aliases ENABLE ROW LEVEL SECURITY;
CREATE INDEX organization_slug_aliases_organization_id_idx ON public.organization_slug_aliases(organization_id);