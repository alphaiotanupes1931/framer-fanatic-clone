alter table public.festival_details
  add column if not exists categories text[] not null default '{}',
  add column if not exists tags text[] not null default '{}',
  add column if not exists audience text,
  add column if not exists admission_type text,
  add column if not exists ticket_url text,
  add column if not exists organizer_name text,
  add column if not exists organizer_description text,
  add column if not exists organizer_website text;