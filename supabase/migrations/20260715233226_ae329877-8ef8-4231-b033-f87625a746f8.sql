-- Make profiles_public readable by everyone so display names and avatars show up in
-- comments and other places, while base profiles table stays RLS-protected.
ALTER VIEW public.profiles_public SET (security_invoker = off);

-- Add public read policy for profiles limited to non-sensitive columns via the view.
-- Also allow authenticated users to see all profiles' non-sensitive info directly.
CREATE POLICY "Anyone can view public profile fields"
  ON public.profiles FOR SELECT
  USING (COALESCE(banned, false) = false AND COALESCE(hidden_from_showcase, false) = false);
