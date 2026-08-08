ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS hide_private_organizations ON public.organizations;
CREATE POLICY hide_private_organizations ON public.organizations AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (is_public = true OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));