REVOKE ALL ON FUNCTION public.admin_list_stripe_logs(integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_clear_stripe_logs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_stripe_logs(integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_clear_stripe_logs() TO authenticated, service_role;