create or replace function public.link_first_friends()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _uid uuid := auth.uid();
  _host uuid;
  _n int := 0;
begin
  if _uid is null then
    return 0;
  end if;

  select id into _host from public.profiles where username = 'ainsleyburrows' limit 1;
  if _host is null or _host = _uid then
    return 0;
  end if;

  insert into public.follows (follower_id, following_id)
  values (_uid, _host)
  on conflict do nothing;

  insert into public.follows (follower_id, following_id)
  values (_host, _uid)
  on conflict do nothing;

  get diagnostics _n = row_count;
  return _n;
end;
$$;

grant execute on function public.link_first_friends() to authenticated;