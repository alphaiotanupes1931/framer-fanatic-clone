
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  p.id,
  p.display_name,
  p.username,
  p.avatar_url,
  p.banner_url,
  p.bio,
  p.website,
  p.neighborhood,
  p.neighborhood_names,
  p.role,
  p.category,
  p.in_baltimore,
  p.is_baltimore_verified,
  p.is_founder,
  p.created_at,
  p.last_seen_at
FROM public.profiles p
WHERE COALESCE(p.banned, false) = false
  AND COALESCE(p.hidden_from_showcase, false) = false;

GRANT SELECT ON public.profiles_public TO anon, authenticated;
