CREATE TABLE public.org_visibility_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_is_public BOOLEAN,
  new_is_public BOOLEAN NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_visibility_audit_org ON public.org_visibility_audit(organization_id, created_at DESC);

GRANT SELECT, INSERT ON public.org_visibility_audit TO authenticated;
GRANT ALL ON public.org_visibility_audit TO service_role;

ALTER TABLE public.org_visibility_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins can view visibility history"
ON public.org_visibility_audit FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = org_visibility_audit.organization_id
      AND o.owner_id = auth.uid()
  )
);

CREATE POLICY "Actors can log their own visibility changes"
ON public.org_visibility_audit FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = org_visibility_audit.organization_id
        AND o.owner_id = auth.uid()
    )
  )
);