REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_post_likes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_post_comments() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_conversation_after_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.public_profile_by_username(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.public_profiles_by_ids(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_profile_by_username(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_profiles_by_ids(uuid[]) TO authenticated, service_role;