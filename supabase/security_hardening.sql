-- NOVA + SIGNAL portfolio security migration.
-- Apply AFTER both websites use RPCs nova_record_event / signal_public_summary.
-- Preserves existing events and does not use service_role credentials in browsers.
-- Data with session identifiers is never granted to anonymous visitors.

create or replace function public.nova_record_event(
 p_id uuid, p_session_id uuid, p_event_name text,
 p_section text, p_device_type text, p_duration_ms integer default null
) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
 if p_event_name is null or p_event_name not in (
 'visit_started','section_viewed','nav_clicked','modal_opened',
 'modal_route_selected','benefit_opened','motion_preference_changed',
 'app_tab_opened','demo_transfer_completed','demo_topup',
 'card_status_changed','visit_ended'
 ) then return false; end if;
 if p_section is not null and p_section not in
 ('hero','experience','security','wealth','world','benefits','app','footer')
 then return false; end if;
 if p_device_type is null or p_device_type not in ('mobile','tablet','desktop') then return false; end if;
 if p_duration_ms is not null and (p_duration_ms < 0 or p_duration_ms > 3600000) then return false; end if;

 -- Anonymous, consent-first demo: coarse abuse caps, NOT production-grade rate limiting.
 if (select count(*) from public.nova_events
     where session_id=p_session_id and created_at > now()-interval '24 hours') >= 100
 then return false; end if;
 if (select count(*) from public.nova_events
     where created_at > now()-interval '24 hours') >= 2000
 then return false; end if;

 insert into public.nova_events
  (id,session_id,event_name,section,device_type,duration_ms,created_at)
 values (p_id,p_session_id,p_event_name,p_section,p_device_type,p_duration_ms,now())
 on conflict (id) do nothing;
 return true;
end $$;

create or replace function public.signal_public_summary()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
 v_sessions integer;
 v_result jsonb;
begin
 select count(distinct session_id) into v_sessions
 from public.nova_events
 where event_name='visit_started' and created_at>=now()-interval '7 days';

 -- Small cohorts are suppressed to avoid publishing granular browser traces.
 if v_sessions < 5 then
  return jsonb_build_object('minimumSessions',5,'visits',0);
 end if;

 with starts as (
  select distinct on (session_id) session_id, created_at::date as day, device_type
  from public.nova_events
  where event_name='visit_started' and created_at>=now()-interval '7 days'
  order by session_id, created_at
 ), activity as (
  select s.session_id,s.day,s.device_type,
   exists(select 1 from public.nova_events e where e.session_id=s.session_id
    and e.event_name='section_viewed' and e.section='app') as reached_app,
   exists(select 1 from public.nova_events e where e.session_id=s.session_id
    and e.event_name in ('nav_clicked','modal_opened','modal_route_selected','benefit_opened',
      'motion_preference_changed','app_tab_opened','demo_transfer_completed','demo_topup','card_status_changed')) as interacted,
   (select max(e.duration_ms) from public.nova_events e
     where e.session_id=s.session_id and e.event_name='visit_ended') as duration_ms
  from starts s
 )
 select jsonb_build_object(
  'minimumSessions',5,
  'visits',v_sessions,
  'appReach',count(*) filter(where reached_app),
  'appReachRate',round(100.0*count(*) filter(where reached_app)/v_sessions,1),
  'interactionRate',round(100.0*count(*) filter(where interacted)/v_sessions,1),
  'avgTimeSeconds',coalesce(round(avg(duration_ms)/1000.0,1),0),
  'motionChanges',(select count(*) from public.nova_events where event_name='motion_preference_changed' and created_at>=now()-interval '7 days'),
  'benefits',(select count(*) from public.nova_events where event_name='benefit_opened' and created_at>=now()-interval '7 days'),
  'transfers',(select count(*) from public.nova_events where event_name='demo_transfer_completed' and created_at>=now()-interval '7 days'),
  'eventCount',(select count(*) from public.nova_events where created_at>=now()-interval '7 days'),
  'sectionFunnel',(
   select coalesce(jsonb_agg(jsonb_build_object(
    'name',case sec.section
      when 'hero' then 'Introduction' when 'experience' then 'Signature card'
      when 'security' then 'Security' when 'wealth' then 'Wealth'
      when 'world' then 'Worldwide' when 'benefits' then 'Benefits' else 'Banking app' end,
    'count', (select count(distinct e.session_id) from public.nova_events e
      where e.event_name='section_viewed' and e.section=sec.section
      and e.session_id in (select a.session_id from activity)),
    'rate',round(100.0*(select count(distinct e.session_id) from public.nova_events e
      where e.event_name='section_viewed' and e.section=sec.section
      and e.session_id in (select a.session_id from activity))/v_sessions,1)
   ) order by sec.ord),'[]'::jsonb)
   from unnest(array['hero','experience','security','wealth','world','benefits','app'])
    with ordinality as sec(section,ord)
  ),
  'daily',(
   select coalesce(jsonb_agg(jsonb_build_object(
    'date',d::date,
    'started',(select count(*) from activity a where a.day=d::date),
    'app',(select count(*) from activity a where a.day=d::date and a.reached_app),
    'rate',case when (select count(*) from activity a where a.day=d::date)=0 then 0
     else round(100.0*(select count(*) from activity a where a.day=d::date and a.reached_app)
         /(select count(*) from activity a where a.day=d::date),1) end
    ) order by d),'[]'::jsonb)
   from generate_series((current_date-6)::timestamp,current_date::timestamp,interval '1 day') as ds(d)
  ),
  'topEvents',(
   select coalesce(jsonb_agg(jsonb_build_object('event_name',z.event_name,
    'section',z.section,'count',z.total) order by z.total desc),'[]'::jsonb)
   from (select e.event_name,e.section,count(*) as total from public.nova_events e
     where e.created_at>=now()-interval '7 days'
     group by e.event_name,e.section order by total desc limit 5) z
  )
 ) into v_result
 from activity;
 return v_result;
end $$;

-- Eliminate public access to individual session identifiers and timestamps.
drop policy if exists nova_demo_read on public.nova_events;
drop policy if exists nova_demo_insert on public.nova_events;
revoke all on table public.nova_events from public, anon, authenticated;
revoke all on function public.nova_record_event(uuid,uuid,text,text,text,integer) from public, anon, authenticated;
revoke all on function public.signal_public_summary() from public, anon, authenticated;
grant usage on schema public to anon;
grant execute on function public.nova_record_event(uuid,uuid,text,text,text,integer) to anon;
grant execute on function public.signal_public_summary() to anon;

-- Realtime replication of raw rows is unnecessary and may disclose metadata.
do $$ begin
 if exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
    and schemaname='public' and tablename='nova_events')
 then alter publication supabase_realtime drop table public.nova_events; end if;
end $$;

-- Existing policy for unrelated demo table ux_events, if present, also exposes rows.
-- Remove only its anon read privilege and policy, without dropping any data.
do $$ begin
 if to_regclass('public.ux_events') is not null then
  execute 'drop policy if exists demo_read_events on public.ux_events';
  execute 'drop policy if exists demo_insert_events on public.ux_events';
  execute 'revoke all on table public.ux_events from public, anon, authenticated';
 end if;
end $;
do $ begin
 if to_regclass('public.ux_events') is not null and exists(
  select 1 from pg_publication_tables where pubname='supabase_realtime'
   and schemaname='public' and tablename='ux_events'
 ) then alter publication supabase_realtime drop table public.ux_events; end if;
end $;
notify pgrst, 'reload schema';

-- Verification (should show no anon SELECT/INSERT grants on nova_events):
-- select grantee,privilege_type from information_schema.role_table_grants
-- where table_schema='public' and table_name='nova_events' and grantee='anon';
