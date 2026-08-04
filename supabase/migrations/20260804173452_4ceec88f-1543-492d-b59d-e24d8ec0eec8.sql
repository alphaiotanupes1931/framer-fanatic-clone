-- 1. Remove the header backdoor
CREATE OR REPLACE FUNCTION public.is_admin_caller()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(auth.uid(), 'admin')
    OR COALESCE(auth.role(), '') = 'service_role';
$function$;

-- 2. Lock down profiles.email at the column level
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, display_name, created_at, updated_at, role, latitude, longitude, in_baltimore, avatar_url, onboarded, username, bio, website, neighborhood, banner_url, stripe_account_id, stripe_account_status, stripe_charges_enabled, city, is_baltimore_verified, geo_lat, geo_lng, banned, last_seen_at, category, hidden_from_showcase, is_founder, must_reset_password, neighborhood_names, referred_by) ON public.profiles TO anon;
GRANT SELECT (id, display_name, created_at, updated_at, role, latitude, longitude, in_baltimore, avatar_url, onboarded, username, bio, website, neighborhood, banner_url, stripe_account_id, stripe_account_status, stripe_charges_enabled, city, is_baltimore_verified, geo_lat, geo_lng, banned, last_seen_at, category, hidden_from_showcase, is_founder, must_reset_password, neighborhood_names, referred_by) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.my_profile()
RETURNS TABLE(
  id uuid, email text, display_name text, username text, avatar_url text, role text,
  category text, neighborhood text, neighborhood_names text[], bio text, website text,
  banner_url text, is_founder boolean, onboarded boolean, must_reset_password boolean,
  stripe_account_id text, stripe_account_status text, stripe_charges_enabled boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id, p.email, p.display_name, p.username, p.avatar_url, p.role,
         p.category, p.neighborhood, p.neighborhood_names, p.bio, p.website,
         p.banner_url, COALESCE(p.is_founder,false), COALESCE(p.onboarded,false),
         COALESCE(p.must_reset_password,false),
         p.stripe_account_id, p.stripe_account_status, COALESCE(p.stripe_charges_enabled,false)
  FROM public.profiles p
  WHERE p.id = auth.uid();
$function$;

REVOKE ALL ON FUNCTION public.my_profile() FROM public;
GRANT EXECUTE ON FUNCTION public.my_profile() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.event_buyer_contacts(_event_id uuid)
RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT DISTINCT p.id, p.display_name, p.username, p.avatar_url, p.email
  FROM public.tickets t
  JOIN public.profiles p ON p.id = t.buyer_id
  WHERE t.event_id = _event_id
    AND (
      EXISTS (SELECT 1 FROM public.events e WHERE e.id = _event_id AND e.user_id = auth.uid())
      OR public.is_admin_caller()
    );
$function$;

REVOKE ALL ON FUNCTION public.event_buyer_contacts(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.event_buyer_contacts(uuid) TO authenticated, service_role;

-- 3. Enforce post visibility
DROP POLICY IF EXISTS "posts viewable" ON public.posts;

CREATE POLICY "Public posts are viewable by everyone"
ON public.posts FOR SELECT TO anon
USING (COALESCE(visibility, 'public') = 'public');

CREATE POLICY "Posts viewable per visibility"
ON public.posts FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR COALESCE(visibility, 'public') = 'public'
  OR (
    visibility = 'followers'
    AND EXISTS (SELECT 1 FROM public.follows f WHERE f.following_id = posts.user_id AND f.follower_id = auth.uid())
  )
  OR (
    visibility = 'close_friends'
    AND EXISTS (SELECT 1 FROM public.close_friends c WHERE c.user_id = posts.user_id AND c.friend_id = auth.uid())
  )
);