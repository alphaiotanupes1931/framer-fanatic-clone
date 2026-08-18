ALTER TABLE public.organizations DROP CONSTRAINT organizations_type_check;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_type_check
  CHECK (type = ANY (ARRAY['arts_org','business','community_assoc','group','artist','resident','visitor']));