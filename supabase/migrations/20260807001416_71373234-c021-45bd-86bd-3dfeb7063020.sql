CREATE TABLE public.organization_board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  bio text,
  email text,
  photo_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_board_members TO authenticated;
GRANT SELECT ON public.organization_board_members TO anon;
GRANT ALL ON public.organization_board_members TO service_role;
ALTER TABLE public.organization_board_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Board members viewable by everyone" ON public.organization_board_members FOR SELECT USING (true);
CREATE POLICY "Org owners add board members" ON public.organization_board_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Org owners update board members" ON public.organization_board_members FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Org owners delete board members" ON public.organization_board_members FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_org_board_members_org ON public.organization_board_members(org_id, sort_order, created_at);

CREATE TRIGGER update_org_board_members_updated_at BEFORE UPDATE ON public.organization_board_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();