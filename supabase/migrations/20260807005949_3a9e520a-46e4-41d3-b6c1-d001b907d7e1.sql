ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS token text,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS invites_token_key ON public.invites (token) WHERE token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_invite_click(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inviter uuid;
BEGIN
  IF _token IS NULL OR length(_token) = 0 THEN
    RETURN NULL;
  END IF;
  UPDATE public.invites
     SET click_count = click_count + 1,
         clicked_at = COALESCE(clicked_at, now())
   WHERE token = _token
  RETURNING invited_by INTO _inviter;
  RETURN _inviter;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_invite_click(text) TO anon, authenticated;