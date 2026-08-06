create or replace function public.set_my_profile_kind(_kind text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  k text := lower(trim(_kind));
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if k not in ('artist','resident','visitor') then
    raise exception 'Invalid profile kind';
  end if;

  update public.profiles set role = k, updated_at = now() where id = uid;

  delete from public.user_roles
    where user_id = uid and role in ('artist'::app_role,'resident'::app_role,'visitor'::app_role)
      and role <> k::app_role;

  insert into public.user_roles (user_id, role)
  values (uid, k::app_role)
  on conflict (user_id, role) do nothing;

  return k;
end;
$$;

revoke all on function public.set_my_profile_kind(text) from public;
grant execute on function public.set_my_profile_kind(text) to authenticated;