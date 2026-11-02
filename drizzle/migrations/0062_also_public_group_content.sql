ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS also_public boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS also_public boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.events_set_private_org()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  new.is_private_org := coalesce(
    (select o.type in ('group', 'community_assoc') from public.organizations o where o.id = new.organization_id),
    false
  ) and not coalesce(new.also_public, false);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.organizations_sync_private_events()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if new.type is distinct from old.type then
    update public.events
      set is_private_org = (new.type in ('group', 'community_assoc')) and not also_public
      where organization_id = new.id;
  end if;
  return new;
end;
$function$;