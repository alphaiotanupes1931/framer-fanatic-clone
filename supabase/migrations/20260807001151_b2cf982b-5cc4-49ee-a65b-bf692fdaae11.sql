CREATE TABLE public.organization_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  doc_type text NOT NULL DEFAULT 'document',
  file_url text NOT NULL,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_documents TO authenticated;
GRANT SELECT ON public.organization_documents TO anon;
GRANT ALL ON public.organization_documents TO service_role;
ALTER TABLE public.organization_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Documents viewable by everyone" ON public.organization_documents FOR SELECT USING (true);
CREATE POLICY "Org owners upload documents" ON public.organization_documents FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE POLICY "Owner or admin update documents" ON public.organization_documents FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE POLICY "Owner or admin delete documents" ON public.organization_documents FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));

CREATE INDEX idx_org_documents_org ON public.organization_documents(org_id, created_at DESC);