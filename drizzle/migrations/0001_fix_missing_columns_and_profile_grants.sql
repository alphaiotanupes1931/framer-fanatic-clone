ALTER TABLE public.organization_posts ADD COLUMN IF NOT EXISTS opportunity_type text;
ALTER TABLE public.organization_posts ADD COLUMN IF NOT EXISTS deadline date;

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS pricing_mode text;

-- Restore Data API reads of non-sensitive profile columns. Sensitive columns
-- (email, stripe_*, must_reset_password, geo/lat/lng) stay unreadable.
GRANT SELECT (
  id, display_name, created_at, updated_at, role, in_baltimore, avatar_url,
  onboarded, username, bio, website, neighborhood, banner_url, city,
  is_baltimore_verified, banned, last_seen_at, category, hidden_from_showcase,
  is_founder, neighborhood_names, referred_by
) ON public.profiles TO authenticated;

GRANT SELECT (
  id, display_name, created_at, role, in_baltimore, avatar_url, username, bio,
  website, neighborhood, banner_url, city, is_baltimore_verified, last_seen_at,
  category, is_founder, neighborhood_names
) ON public.profiles TO anon;