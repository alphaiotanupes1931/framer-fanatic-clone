create or replace function public.referral_network_stats(_user_id uuid)
returns table(level1 integer, level2 integer, level3 integer, points integer)
language sql
stable
security definer
set search_path to 'public'
as $$
  with l1 as (select id from public.profiles where referred_by = _user_id),
       l2 as (select p.id from public.profiles p join l1 on p.referred_by = l1.id),
       l3 as (select p.id from public.profiles p join l2 on p.referred_by = l2.id)
  select (select count(*)::int from l1),
         (select count(*)::int from l2),
         (select count(*)::int from l3),
         (select count(*)::int from l1) * 5
           + (select count(*)::int from l2) * 3
           + (select count(*)::int from l3) * 1;
$$;

grant execute on function public.referral_network_stats(uuid) to authenticated, anon;

create or replace function public.link_first_friends()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _uid uuid := auth.uid();
  _n int := 0;
begin
  if _uid is null then
    return 0;
  end if;

  insert into public.follows (follower_id, following_id)
  select _uid, ur.user_id from public.user_roles ur
    where ur.role = 'admin' and ur.user_id <> _uid
  on conflict do nothing;

  insert into public.follows (follower_id, following_id)
  select ur.user_id, _uid from public.user_roles ur
    where ur.role = 'admin' and ur.user_id <> _uid
  on conflict do nothing;

  get diagnostics _n = row_count;
  return _n;
end;
$$;

grant execute on function public.link_first_friends() to authenticated;