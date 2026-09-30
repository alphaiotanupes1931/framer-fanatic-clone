create or replace function public.admin_list_suppressed_emails()
returns table (id uuid, email text, reason text, created_at timestamptz, metadata jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.email, s.reason, s.created_at, s.metadata
  from public.suppressed_emails s
  where public.is_admin_caller()
  order by s.created_at desc
$$;

revoke all on function public.admin_list_suppressed_emails() from public;
grant execute on function public.admin_list_suppressed_emails() to authenticated, service_role;