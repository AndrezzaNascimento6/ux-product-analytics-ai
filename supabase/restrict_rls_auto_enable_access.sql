-- NOVA + SIGNAL: this event-trigger helper is used internally by PostgreSQL.
-- Browser clients should not have permission to invoke it over PostgREST.
-- The existing database event trigger continues to run; no tables or data change.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Verification:
-- select has_function_privilege('anon','public.rls_auto_enable()','EXECUTE');
-- Expected: false
