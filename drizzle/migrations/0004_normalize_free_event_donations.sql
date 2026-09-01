CREATE OR REPLACE FUNCTION public.normalize_event_pricing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.donations_enabled THEN
    NEW.pricing_mode := 'free';
    NEW.price_cents := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_event_pricing_trigger ON public.events;
CREATE TRIGGER normalize_event_pricing_trigger
BEFORE INSERT OR UPDATE OF donations_enabled, pricing_mode, price_cents
ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.normalize_event_pricing();

UPDATE public.events
SET pricing_mode = 'free', price_cents = 0
WHERE donations_enabled = true
  AND (pricing_mode IS DISTINCT FROM 'free' OR price_cents IS DISTINCT FROM 0);