CREATE OR REPLACE FUNCTION public.organizations_unique_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
BEGIN
  base := lower(regexp_replace(coalesce(nullif(NEW.slug, ''), NEW.name, ''), '[^a-zA-Z0-9]+', '', 'g'));
  IF base = '' THEN base := coalesce(NEW.type::text, 'page'); END IF;
  IF TG_OP = 'UPDATE' AND base = OLD.slug THEN
    NEW.slug := OLD.slug;
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(base));
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = candidate AND id <> NEW.id)
     OR EXISTS (SELECT 1 FROM public.organization_slug_aliases WHERE old_slug = candidate AND organization_id <> NEW.id) LOOP
    n := n + 1;
    candidate := base || n;
  END LOOP;
  NEW.slug := candidate;
  IF TG_OP = 'UPDATE' AND OLD.slug IS DISTINCT FROM NEW.slug THEN
    DELETE FROM public.organization_slug_aliases WHERE old_slug = NEW.slug AND organization_id = NEW.id;
    INSERT INTO public.organization_slug_aliases (old_slug, organization_id)
    VALUES (OLD.slug, NEW.id)
    ON CONFLICT (old_slug) DO UPDATE SET organization_id = EXCLUDED.organization_id;
  END IF;
  RETURN NEW;
END;
$$;