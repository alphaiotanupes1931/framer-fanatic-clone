
-- 1) posts: drop the permissive insert policy that bypasses artist gate
DROP POLICY IF EXISTS "users create posts" ON public.posts;
DROP POLICY IF EXISTS "Only artists can create posts" ON public.posts;
CREATE POLICY "Artists create own posts" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'artist'::app_role));

-- 2) profiles: block self-updates to sensitive columns via trigger
CREATE OR REPLACE FUNCTION public.profiles_guard_sensitive_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins and service_role bypass the guard
  IF public.has_role(auth.uid(), 'admin'::app_role) OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.role                    := OLD.role;
  NEW.banned                  := OLD.banned;
  NEW.is_founder              := OLD.is_founder;
  NEW.is_baltimore_verified   := OLD.is_baltimore_verified;
  NEW.stripe_account_id       := OLD.stripe_account_id;
  NEW.stripe_account_status   := OLD.stripe_account_status;
  NEW.stripe_charges_enabled  := OLD.stripe_charges_enabled;
  NEW.must_reset_password     := OLD.must_reset_password;
  NEW.hidden_from_showcase    := OLD.hidden_from_showcase;
  NEW.email                   := OLD.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_sensitive_updates ON public.profiles;
CREATE TRIGGER profiles_guard_sensitive_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_sensitive_updates();

-- 3) profiles_public view: switch to security invoker
ALTER VIEW public.profiles_public SET (security_invoker = on);

-- 4) organizations: hide email/phone from anon
REVOKE SELECT (email, phone) ON public.organizations FROM anon;
REVOKE SELECT (email, phone) ON public.organizations FROM PUBLIC;

-- 5) revoke execute on internal/admin security definer functions
REVOKE EXECUTE ON FUNCTION public.assign_default_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_post_comments() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_post_likes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_story_comments() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_story_likes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_follow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_post_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_post_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_story_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_story_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_conversation_after_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_guard_sensitive_updates() FROM PUBLIC, anon, authenticated;

-- Admin RPCs: signed-in only (they still self-check has_role internally)
REVOKE EXECUTE ON FUNCTION public.admin_delete_event(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_organization(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_profile(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_events() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_organizations() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_banned(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_showcase_hidden(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.touch_last_seen() FROM PUBLIC, anon;
