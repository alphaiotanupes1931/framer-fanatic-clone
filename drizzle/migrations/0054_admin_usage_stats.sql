create or replace function public.admin_storage_summary()
returns table(bucket text, kind text, files bigint, bytes bigint)
language sql stable security definer set search_path = public, storage as $$
  select o.bucket_id::text,
    case
      when coalesce(o.metadata->>'mimetype','') like 'video/%' then 'Videos'
      when coalesce(o.metadata->>'mimetype','') like 'image/%' then 'Photos'
      when coalesce(o.metadata->>'mimetype','') like 'audio/%' then 'Audio'
      when coalesce(o.metadata->>'mimetype','') = 'application/pdf' then 'PDFs'
      else 'Other files' end,
    count(*)::bigint, coalesce(sum((o.metadata->>'size')::bigint),0)::bigint
  from storage.objects o
  where public.is_admin_caller()
  group by 1,2;
$$;

create or replace function public.admin_storage_daily(_days integer default 30)
returns table(day date, files bigint, bytes bigint)
language sql stable security definer set search_path = public, storage as $$
  select (o.created_at at time zone 'America/New_York')::date, count(*)::bigint,
         coalesce(sum((o.metadata->>'size')::bigint),0)::bigint
  from storage.objects o
  where public.is_admin_caller()
    and o.created_at >= now() - make_interval(days => greatest(1, least(coalesce(_days,30), 365)))
  group by 1 order by 1;
$$;

create or replace function public.admin_storage_top_uploaders(_limit integer default 10)
returns table(user_id uuid, display_name text, username text, files bigint, bytes bigint)
language sql stable security definer set search_path = public, storage as $$
  select p.id, p.display_name, p.username, count(*)::bigint, coalesce(sum((o.metadata->>'size')::bigint),0)::bigint
  from storage.objects o
  join public.profiles p on p.id::text = (storage.foldername(o.name))[1]
  where public.is_admin_caller()
  group by 1,2,3 order by 5 desc
  limit greatest(1, least(coalesce(_limit,10), 50));
$$;

create or replace function public.admin_email_log(_start timestamptz, _end timestamptz, _template text default null, _status text default null, _limit integer default 50, _offset integer default 0)
returns table(message_id text, template_name text, recipient_email text, status text, error_message text, created_at timestamptz, total bigint)
language sql stable security definer set search_path = public as $$
  with latest as (
    select distinct on (l.message_id) l.message_id, l.template_name, l.recipient_email, l.status, l.error_message, l.created_at
    from public.email_send_log l
    where l.message_id is not null and public.is_admin_caller()
    order by l.message_id, l.created_at desc
  ), f as (
    select * from latest
    where created_at >= _start and created_at < _end
      and (_template is null or _template = '' or template_name = _template)
      and (_status is null or _status = '' or status = _status)
  )
  select f.*, count(*) over () from f
  order by f.created_at desc
  limit greatest(1, least(coalesce(_limit,50), 200)) offset greatest(0, coalesce(_offset,0));
$$;

create or replace function public.admin_email_stats(_start timestamptz, _end timestamptz, _template text default null)
returns table(day date, template_name text, status text, emails bigint)
language sql stable security definer set search_path = public as $$
  with latest as (
    select distinct on (l.message_id) l.template_name, l.status, l.created_at
    from public.email_send_log l
    where l.message_id is not null and public.is_admin_caller()
    order by l.message_id, l.created_at desc
  )
  select (created_at at time zone 'America/New_York')::date, template_name, status, count(*)::bigint
  from latest
  where created_at >= _start and created_at < _end
    and (_template is null or _template = '' or template_name = _template)
  group by 1,2,3 order by 1;
$$;

create or replace function public.admin_email_templates()
returns table(template_name text)
language sql stable security definer set search_path = public as $$
  select distinct l.template_name from public.email_send_log l
  where public.is_admin_caller() and l.template_name is not null order by 1;
$$;

revoke execute on function public.admin_storage_summary(), public.admin_storage_daily(integer), public.admin_storage_top_uploaders(integer), public.admin_email_log(timestamptz,timestamptz,text,text,integer,integer), public.admin_email_stats(timestamptz,timestamptz,text), public.admin_email_templates() from public, anon;
grant execute on function public.admin_storage_summary(), public.admin_storage_daily(integer), public.admin_storage_top_uploaders(integer), public.admin_email_log(timestamptz,timestamptz,text,text,integer,integer), public.admin_email_stats(timestamptz,timestamptz,text), public.admin_email_templates() to authenticated, service_role;
