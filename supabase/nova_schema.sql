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

-- Do NOT grant anonymous table reads/inserts or enable Realtime on this table.
-- After creating it, apply security_hardening.sql to install validated write
-- and private/aggregated read RPCs. Running the migration also removes legacy
-- grants and policies from existing deployments.
revoke all on table public.nova_events from anon, authenticated;
