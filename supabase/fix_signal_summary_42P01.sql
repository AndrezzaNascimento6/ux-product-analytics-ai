-- Fix only the SIGNAL aggregate summary function (PostgreSQL error 42P01).
-- Does NOT change RLS, table grants, realtime publications, or saved events.
-- Paste the entire content into nova-analytics -> SQL Editor -> Run.
-- Supersedes the bug in the initial security_hardening.sql.
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
      and e.session_id in (select a.session_id from activity a)),
    'rate',round(100.0*(select count(distinct e.session_id) from public.nova_events e
      where e.event_name='section_viewed' and e.section=sec.section
      and e.session_id in (select a.session_id from activity a))/v_sessions,1)
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

-- Ensure the summary remains invokable from the public, publishable-key frontend
-- without granting any raw-table access.
revoke all on function public.signal_public_summary() from public, anon, authenticated;
grant execute on function public.signal_public_summary() to anon;
notify pgrst, 'reload schema';

-- After running this migration, verify it in a new query:
-- select public.signal_public_summary();
