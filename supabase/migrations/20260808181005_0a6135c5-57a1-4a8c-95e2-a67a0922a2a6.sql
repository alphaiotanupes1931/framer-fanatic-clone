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

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_key text NOT NULL,
  reward_name text NOT NULL,
  points_spent integer NOT NULL DEFAULT 0,
  contact_note text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.referral_rewards TO authenticated;
GRANT ALL ON public.referral_rewards TO service_role;

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reward claims" ON public.referral_rewards;
CREATE POLICY "Users can view their own reward claims"
ON public.referral_rewards FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can create their own reward claims" ON public.referral_rewards;
CREATE POLICY "Users can create their own reward claims"
ON public.referral_rewards FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update reward claims" ON public.referral_rewards;
CREATE POLICY "Admins can update reward claims"
ON public.referral_rewards FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_referral_rewards_updated_at ON public.referral_rewards;
CREATE TRIGGER update_referral_rewards_updated_at
BEFORE UPDATE ON public.referral_rewards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_set_founder(_user_id uuid, _is_founder boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_caller() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.profiles SET is_founder = _is_founder, updated_at = now() WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_founder(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_founder(uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_founder_visible(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.is_admin_caller()
    THEN COALESCE((SELECT is_founder FROM public.profiles WHERE id = _user_id), false)
    ELSE false END;
$$;

REVOKE ALL ON FUNCTION public.is_founder_visible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_founder_visible(uuid) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.stripe_event_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'webhook',
  event_type text NOT NULL,
  event_id text,
  status text NOT NULL DEFAULT 'ok',
  message text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.stripe_event_logs TO service_role;

ALTER TABLE public.stripe_event_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS stripe_event_logs_created_at_idx ON public.stripe_event_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS stripe_event_logs_status_idx ON public.stripe_event_logs (status);

CREATE OR REPLACE FUNCTION public.admin_list_stripe_logs(_limit integer DEFAULT 200, _status text DEFAULT NULL)
RETURNS TABLE(id uuid, source text, event_type text, event_id text, status text, message text, details jsonb, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT l.id, l.source, l.event_type, l.event_id, l.status, l.message, l.details, l.created_at
  FROM public.stripe_event_logs l
  WHERE public.is_admin_caller()
    AND (_status IS NULL OR _status = '' OR l.status = _status)
  ORDER BY l.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 200), 1000));
$$;

CREATE OR REPLACE FUNCTION public.admin_clear_stripe_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.stripe_event_logs;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS bylaws text,
  ADD COLUMN IF NOT EXISTS rules text;