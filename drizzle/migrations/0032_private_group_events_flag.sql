alter table public.events add column if not exists is_private_org boolean not null default false;

create or replace function public.events_set_private_org()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  new.is_private_org := coalesce(
    (select o.type in ('group', 'community_assoc') from public.organizations o where o.id = new.organization_id),
    false
  );
  return new;
end;
$$;

drop trigger if exists events_set_private_org_trg on public.events;
create trigger events_set_private_org_trg
before insert or update of organization_id on public.events
for each row execute function public.events_set_private_org();

create or replace function public.organizations_sync_private_events()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.type is distinct from old.type then
    update public.events
      set is_private_org = (new.type in ('group', 'community_assoc'))
      where organization_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_sync_private_events_trg on public.organizations;
create trigger organizations_sync_private_events_trg
after update of type on public.organizations
for each row execute function public.organizations_sync_private_events();

update public.events e
set is_private_org = true
from public.organizations o
where o.id = e.organization_id
  and o.type in ('group', 'community_assoc')
  and e.is_private_org = false;