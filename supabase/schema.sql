-- SIGNAL is an educational public demo: events contain NO PII.
-- Do not send names, email addresses, IP addresses or form values to this table.
create table if not exists public.ux_events (
  id uuid primary key,
  session_id uuid not null,
  event_name text not null check (event_name in (
    'flow_started','step_viewed','step_completed','validation_error',
    'flow_completed','flow_abandoned'
  )),
  step text not null check (step in ('welcome','profile','goals','review','complete')),
  duration_ms integer check (duration_ms is null or (duration_ms >= 0 and duration_ms <= 3600000)),
  created_at timestamptz not null default now()
);
create index if not exists ux_events_created_at_idx on public.ux_events (created_at desc);
alter table public.ux_events enable row level security;
-- Public aggregate telemetry demo. No personal information is collected.
-- Do not reuse unrestricted public policies for a production analytics system.
create policy "demo_read_events" on public.ux_events for select to anon using (true);
create policy "demo_insert_events" on public.ux_events for insert to anon with check (
  event_name in ('flow_started','step_viewed','step_completed','validation_error','flow_completed','flow_abandoned')
  and step in ('welcome','profile','goals','review','complete')
  and (duration_ms is null or (duration_ms between 0 and 3600000))
);
-- Run once to enable Realtime (skip if already added).
alter publication supabase_realtime add table public.ux_events;
