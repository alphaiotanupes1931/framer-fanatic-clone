CREATE OR REPLACE FUNCTION public.is_org_follower(_org uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _uid IS NOT NULL AND EXISTS (SELECT 1 FROM public.organization_followers WHERE organization_id = _org AND user_id = _uid)
$$;

CREATE OR REPLACE FUNCTION public.can_view_org(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN _org IS NULL THEN true ELSE EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = _org AND (
      COALESCE(o.is_public, true) = true OR o.owner_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR public.is_org_member(o.id, auth.uid())
      OR public.is_org_follower(o.id, auth.uid())))
  END
$$;

DROP POLICY IF EXISTS hide_private_organizations ON public.organizations;
CREATE POLICY hide_private_organizations ON public.organizations FOR SELECT USING (
  is_public = true OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  OR public.is_org_member(id, auth.uid()) OR public.is_org_follower(id, auth.uid()));

-- New follows on a private page require an existing approved membership or ownership,
-- so following cannot be used to bypass a private page's approval.
CREATE OR REPLACE FUNCTION public.guard_private_org_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = NEW.organization_id AND COALESCE(o.is_public, true) = false
             AND o.owner_id IS DISTINCT FROM NEW.user_id)
     AND NOT public.is_org_member(NEW.organization_id, NEW.user_id)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'This page is private. Request to join instead.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_private_org_follow ON public.organization_followers;
CREATE TRIGGER guard_private_org_follow BEFORE INSERT ON public.organization_followers
FOR EACH ROW EXECUTE FUNCTION public.guard_private_org_follow();

CREATE OR REPLACE FUNCTION public.organizations_unique_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE base text; candidate text; n int := 1;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name AND NEW.slug IS NOT DISTINCT FROM OLD.slug THEN
    base := lower(regexp_replace(coalesce(NEW.name, ''), '[^a-zA-Z0-9]+', '', 'g'));
  ELSE
    base := lower(regexp_replace(coalesce(nullif(NEW.slug, ''), NEW.name, ''), '[^a-zA-Z0-9]+', '', 'g'));
  END IF;
  IF base = '' THEN base := coalesce(NEW.type::text, 'page'); END IF;
  IF TG_OP = 'UPDATE' AND base = OLD.slug THEN NEW.slug := OLD.slug; RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(base));
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = candidate AND id <> NEW.id)
     OR EXISTS (SELECT 1 FROM public.organization_slug_aliases WHERE old_slug = candidate AND organization_id <> NEW.id) LOOP
    n := n + 1; candidate := base || n;
  END LOOP;
  NEW.slug := candidate;
  IF TG_OP = 'UPDATE' AND OLD.slug IS DISTINCT FROM NEW.slug THEN
    DELETE FROM public.organization_slug_aliases WHERE old_slug = NEW.slug AND organization_id = NEW.id;
    INSERT INTO public.organization_slug_aliases (old_slug, organization_id) VALUES (OLD.slug, NEW.id)
    ON CONFLICT (old_slug) DO UPDATE SET organization_id = EXCLUDED.organization_id;
  END IF;
  RETURN NEW;
END $function$;