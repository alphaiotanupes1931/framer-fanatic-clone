
CREATE OR REPLACE FUNCTION public.titlecase_name(s text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN s IS NULL OR length(btrim(s)) = 0 THEN s
    ELSE initcap(lower(btrim(regexp_replace(s, '\s+', ' ', 'g'))))
  END
$$;

CREATE OR REPLACE FUNCTION public.profiles_titlecase_display_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.display_name IS NOT NULL THEN
    NEW.display_name := public.titlecase_name(NEW.display_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_titlecase_name ON public.profiles;
CREATE TRIGGER trg_profiles_titlecase_name
BEFORE INSERT OR UPDATE OF display_name ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_titlecase_display_name();

-- Backfill existing
UPDATE public.profiles
SET display_name = public.titlecase_name(display_name)
WHERE display_name IS NOT NULL
  AND display_name <> public.titlecase_name(display_name);
