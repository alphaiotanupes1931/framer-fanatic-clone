ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS accepted_user_id uuid;

CREATE INDEX IF NOT EXISTS invites_email_lower_idx ON public.invites (lower(email));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  requested_role text := COALESCE(m->>'role','resident');
  ref uuid;
BEGIN
  BEGIN
    ref := NULLIF(m->>'referred_by','')::uuid;
  EXCEPTION WHEN others THEN
    ref := NULL;
  END;

  -- Fallback attribution: if no referrer came through the link, credit the
  -- person who emailed an invite to this exact address.
  IF ref IS NULL AND NEW.email IS NOT NULL THEN
    SELECT i.invited_by INTO ref
    FROM public.invites i
    WHERE lower(i.email) = lower(NEW.email)
      AND i.invited_by IS NOT NULL
      AND i.invited_by <> NEW.id
    ORDER BY i.created_at DESC
    LIMIT 1;
  END IF;

  IF ref = NEW.id THEN
    ref := NULL;
  END IF;

  INSERT INTO public.profiles (id, email, display_name, role, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(m->>'display_name', m->>'full_name', split_part(NEW.email,'@',1)),
    CASE WHEN requested_role IN ('artist','resident','visitor') THEN requested_role ELSE 'resident' END,
    ref
  )
  ON CONFLICT (id) DO NOTHING;

  -- Mark any matching invites as accepted so the sender sees "Joined".
  IF NEW.email IS NOT NULL THEN
    UPDATE public.invites
       SET accepted_at = COALESCE(accepted_at, now()),
           accepted_user_id = COALESCE(accepted_user_id, NEW.id)
     WHERE lower(email) = lower(NEW.email)
       AND invited_by IS DISTINCT FROM NEW.id;
  END IF;

  RETURN NEW;
END;
$$;