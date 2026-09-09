create table public.festival_details (
  event_id uuid primary key references public.events(id) on delete cascade,
  tagline text,
  hours text,
  price_label text,
  age_range text,
  format text,
  accessibility text[] not null default '{}',
  rain_or_shine text,
  pet_policy text,
  expected_attendance text,
  footprint text,
  website text,
  schedule jsonb not null default '[]'::jsonb,
  performers jsonb not null default '[]'::jsonb,
  vendors jsonb not null default '[]'::jsonb,
  food jsonb not null default '[]'::jsonb,
  experiences jsonb not null default '[]'::jsonb,
  faqs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

grant select on public.festival_details to anon;
grant select, insert, update, delete on public.festival_details to authenticated;
grant all on public.festival_details to service_role;

alter table public.festival_details enable row level security;

create policy "Festival details are publicly readable"
  on public.festival_details for select
  using (true);

create policy "Event owners manage their festival details"
  on public.festival_details for all to authenticated
  using (exists (select 1 from public.events e where e.id = festival_details.event_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = festival_details.event_id and e.user_id = auth.uid()));