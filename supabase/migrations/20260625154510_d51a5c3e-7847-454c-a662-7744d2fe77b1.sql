
CREATE OR REPLACE FUNCTION public.generate_unique_username(_base text, _self uuid)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  base text := COALESCE(NULLIF(public.slugify_username(_base), ''), 'user');
  candidate text := base;
  n int := 0;
BEGIN
  IF length(base) < 3 THEN base := base || 'user'; candidate := base; END IF;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate AND id IS DISTINCT FROM _self) LOOP
    n := n + 1;
    candidate := base || n::text;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.slugify_username(s text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN s IS NULL OR length(btrim(s)) = 0 THEN NULL
    ELSE regexp_replace(regexp_replace(lower(btrim(s)), '[^a-z0-9]+', '', 'g'), '^$', 'user', 'g')
  END
$$;

CREATE OR REPLACE FUNCTION public.profiles_autofill_username()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.username IS NULL OR length(btrim(NEW.username)) = 0 THEN
    NEW.username := public.generate_unique_username(
      COALESCE(NEW.display_name, split_part(NEW.email, '@', 1), 'user'),
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_autofill_username ON public.profiles;
CREATE TRIGGER trg_profiles_autofill_username
BEFORE INSERT OR UPDATE OF display_name, username ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_autofill_username();

-- Backfill row-by-row so each iteration sees prior assignments
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, display_name, email FROM public.profiles
           WHERE username IS NULL OR length(btrim(username)) = 0
  LOOP
    UPDATE public.profiles
    SET username = public.generate_unique_username(COALESCE(r.display_name, split_part(r.email,'@',1), 'user'), r.id)
    WHERE id = r.id;
  END LOOP;
END $$;
