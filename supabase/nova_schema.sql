-- Run in Supabase SQL Editor for the NOVA + SIGNAL design research experiment.
-- Public DEMO policies only. No real financial information, names, email,
-- form data or account values are collected.
create table if not exists public.nova_events (
  id uuid primary key,
  session_id uuid not null,
  event_name text not null check (event_name in (
    'visit_started','section_viewed','nav_clicked','modal_opened',
    'modal_route_selected','benefit_opened','motion_preference_changed',
    'app_tab_opened','demo_transfer_completed','demo_topup',
    'card_status_changed','visit_ended'
  )),
  section text check (section is null or section in (
    'hero','experience','security','wealth','world','benefits','app','footer'
  )),
  device_type text not null check (device_type in ('mobile','tablet','desktop')),
  duration_ms integer check (duration_ms is null or duration_ms between 0 and 3600000),
  created_at timestamptz not null default now()
);
create index if not exists nova_events_created_at_idx on public.nova_events(created_at desc);
alter table public.nova_events enable row level security;

-- Anyone with publishable/anon credentials can write/read anonymous event rows.
-- Intended ONLY for the public portfolio demo; production requires restricted
-- aggregate queries, anti-abuse protection, retention policies and privacy review.
drop policy if exists "nova_demo_read" on public.nova_events;
drop policy if exists "nova_demo_insert" on public.nova_events;
create policy "nova_demo_read" on public.nova_events for select to anon using (true);
create policy "nova_demo_insert" on public.nova_events for insert to anon with check (
 event_name in ('visit_started','section_viewed','nav_clicked','modal_opened','modal_route_selected',
 'benefit_opened','motion_preference_changed','app_tab_opened','demo_transfer_completed',
 'demo_topup','card_status_changed','visit_ended')
 and (section is null or section in ('hero','experience','security','wealth','world','benefits','app','footer'))
 and device_type in ('mobile','tablet','desktop')
 and (duration_ms is null or duration_ms between 0 and 3600000)
);
-- Required when "Automatically expose new tables" was disabled on project creation.
-- RLS policies alone do not grant table privileges to the anonymous API role.
-- Expose ONLY read + insert for this deliberately public, anonymous experiment.
grant usage on schema public to anon;
grant select, insert on table public.nova_events to anon;

-- Supabase Realtime must be enabled on this table once.
do $$ begin
 if not exists (
 select 1 from pg_publication_tables
 where pubname='supabase_realtime' and schemaname='public' and tablename='nova_events'
 ) then alter publication supabase_realtime add table public.nova_events; end if;
end $$;
