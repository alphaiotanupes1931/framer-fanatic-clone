DROP TRIGGER IF EXISTS organizations_unique_slug ON public.organizations;
CREATE TRIGGER organizations_unique_slug BEFORE INSERT OR UPDATE OF slug, name ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.organizations_unique_slug();