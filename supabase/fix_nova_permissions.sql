-- Fix for 2026+ Supabase projects created with "Automatically expose new tables" OFF.
-- The table and RLS policies already exist. RLS and GRANT are different checks.
-- Run once in nova-analytics → SQL Editor, then click Run.
-- Only grants read/insert privileges to anon. No data is deleted or modified.
grant usage on schema public to anon;
grant select, insert on table public.nova_events to anon;
notify pgrst, 'reload schema';
