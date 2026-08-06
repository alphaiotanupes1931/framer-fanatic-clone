-- 1. Safe yes/no payout readiness check (no account identifiers exposed)
CREATE OR REPLACE FUNCTION public.payouts_ready(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT p.stripe_account_id IS NOT NULL AND COALESCE(p.stripe_charges_enabled, false)
    FROM public.profiles p WHERE p.id = _user_id
  ), false);
$$;
REVOKE ALL ON FUNCTION public.payouts_ready(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.payouts_ready(uuid) TO authenticated, anon;

-- 2. Column-level lockdown of sensitive profile fields
REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id, display_name, created_at, updated_at, role, in_baltimore, avatar_url,
  onboarded, username, bio, website, neighborhood, banner_url, city,
  is_baltimore_verified, banned, last_seen_at, category, hidden_from_showcase,
  is_founder, must_reset_password, neighborhood_names, referred_by
) ON public.profiles TO authenticated;

GRANT SELECT (
  id, display_name, created_at, role, in_baltimore, avatar_url, username, bio,
  website, neighborhood, banner_url, city, is_baltimore_verified, last_seen_at,
  category, is_founder, neighborhood_names
) ON public.profiles TO anon;

GRANT ALL ON public.profiles TO service_role;

-- 3. Public profile view now respects the caller's own permissions
ALTER VIEW public.profiles_public SET (security_invoker = on);
GRANT SELECT ON public.profiles_public TO anon, authenticated;

DROP POLICY IF EXISTS "Public profiles are viewable by visitors" ON public.profiles;
CREATE POLICY "Public profiles are viewable by visitors"
ON public.profiles FOR SELECT TO anon
USING (COALESCE(banned, false) = false AND COALESCE(hidden_from_showcase, false) = false);