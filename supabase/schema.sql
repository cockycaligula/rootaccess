-- VaayuVision Patiala — Supabase Postgres Schema
-- Paste this into your Supabase SQL Editor (https://supabase.com/dashboard -> SQL Editor)

create table if not exists public.citizen_reports (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id text not null,
  issue_type text not null check (issue_type in ('firecrackers', 'stubble_smoke', 'traffic_fumes', 'industrial_dust', 'waste_burning')),
  severity text not null check (severity in ('low', 'medium', 'high')),
  note text not null,
  reporter_name text not null default 'Patiala Resident',
  created_at timestamptz not null default now()
);

create table if not exists public.alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id text not null,
  contact text not null,
  organization text not null default 'Citizen',
  threshold_aqi integer not null default 300,
  created_at timestamptz not null default now()
);

alter table public.citizen_reports enable row level security;
alter table public.alert_subscriptions enable row level security;

create policy "Allow public read/insert on citizen_reports"
  on public.citizen_reports for all
  using (true)
  with check (true);

create policy "Allow public read/insert on alert_subscriptions"
  on public.alert_subscriptions for all
  using (true)
  with check (true);

-- Seed initial Patiala community reports
insert into public.citizen_reports (neighborhood_id, issue_type, severity, note, reporter_name)
values
  ('adalat-bazar', 'firecrackers', 'high', 'Heavy late-evening firecracker bursting near Qila Mubarak chowk trapping smoke in narrow lanes.', 'Market Association'),
  ('sanaur-road', 'stubble_smoke', 'high', 'Thick paddy-stubble smoke plume drifting in from southern agricultural fields after 6 PM.', 'Sanaur Corridor Monitor'),
  ('thapar-prem-nagar', 'stubble_smoke', 'medium', 'Evening haze and burning smell across Bhadson Road and Prem Nagar hostels.', 'Campus Eco Club'),
  ('focal-point', 'industrial_dust', 'medium', 'Boiler emissions and road dust buildup along industrial phase-2 main road.', 'Focal Point Welfare');
