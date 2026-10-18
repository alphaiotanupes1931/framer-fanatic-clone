create or replace function public.admin_storage_monthly()
returns table(month date, gb_hours numeric, end_bytes bigint, added_bytes bigint)
language sql stable security definer set search_path = public, storage as $$
  with m as (
    select generate_series(date_trunc('month', min(created_at)), date_trunc('month', now()), interval '1 month') as ms
    from storage.objects
  ), o as (
    select created_at, coalesce((metadata->>'size')::bigint,0) as sz from storage.objects
  )
  select m.ms::date,
    round(coalesce(sum(o.sz::numeric / 1073741824 * greatest(0, extract(epoch from (least(m.ms + interval '1 month', now()) - greatest(m.ms, o.created_at))) / 3600)),0), 3),
    coalesce(sum(o.sz) filter (where o.created_at < m.ms + interval '1 month'),0)::bigint,
    coalesce(sum(o.sz) filter (where o.created_at >= m.ms and o.created_at < m.ms + interval '1 month'),0)::bigint
  from m left join o on o.created_at < least(m.ms + interval '1 month', now())
  where public.is_admin_caller()
  group by m.ms order by m.ms desc;
$$;
revoke execute on function public.admin_storage_monthly() from public, anon;
grant execute on function public.admin_storage_monthly() to authenticated, service_role;