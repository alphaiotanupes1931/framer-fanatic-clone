create or replace function public.validate_share_recipients(_ids uuid[])
returns table(id uuid, display_name text, username text, status text)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    p.display_name,
    p.username,
    case
      when p.id is null then 'missing'
      when coalesce(p.banned, false) then 'deactivated'
      when not exists (
        select 1 from public.follows f
        where (f.follower_id = auth.uid() and f.following_id = t.id)
           or (f.follower_id = t.id and f.following_id = auth.uid())
      ) then 'blocked'
      else 'ok'
    end as status
  from unnest(coalesce(_ids, '{}'::uuid[])) as t(id)
  left join public.profiles p on p.id = t.id
$$;

grant execute on function public.validate_share_recipients(uuid[]) to authenticated;
revoke execute on function public.validate_share_recipients(uuid[]) from anon;