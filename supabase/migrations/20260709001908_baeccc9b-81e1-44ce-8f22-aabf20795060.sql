
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_events() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_organizations() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_banned(uuid, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_showcase_hidden(uuid, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_event(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_organization(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_profile(uuid) TO anon, authenticated;
