# SIGNAL × NOVA — Privacy-aware Product Intelligence Lab

[**NOVA**](https://wandr-3d-travel-experience.vercel.app/) is a fictional premium banking interaction experience. [**SIGNAL**](https://signal-nova-analytics.vercel.app/) is an educational analytics dashboard illustrating how consent, UX motion, product instrumentation and human-led AI analysis can work together.

**Not a bank, not a recruited participant study, not a production-grade analytics service.**

## Technology

React 19, TypeScript, Vite, Supabase Postgres, Playwright, GitHub Actions, Vercel. Claude is used **manually**, by uploading a deliberately aggregated CSV and a research prompt. No Claude API key is stored or called in SIGNAL.

## What we track (only with NOVA opt-in)

Random session and event UUIDs within the private database; event name, scroll section, coarse viewport device category, bounded duration on session end and server time. We do **not** submit names, email addresses, real payments, demo transfer amounts, typed text, precise GPS or IP addresses in event fields. Network providers may independently process IPs in operational logs, outside SIGNAL exports.

For first-party use, opt out through NOVA's analytics choice. Previously recorded telemetry is subject to data retention and platform controls; withdrawing permission only stops future events and deletes local queued events, not automatically historical database records.

## Privacy boundary and security hardening

The initial prototype allowed the anonymous browser key to read and insert individual rows. **That configuration is retired.** Run [supabase/security_hardening.sql](supabase/security_hardening.sql) on your existing Supabase project to complete the security migration.

This migration:
- Preserves the table and all existing consented events.
- Revokes anonymous table `SELECT`/`INSERT`, drops the permissive row policies and raw Realtime publications.
- Creates `nova_record_event`, a validated insert-only RPC with modest per-session and global protective caps.
- Creates `signal_public_summary`, a read-only, server-computed aggregate RPC; releases no raw event IDs, session IDs, full timelines, exact timestamps or individual device traces.
- Suppresses cloud metrics for cohorts smaller than five browser sessions.
- Decommissions legacy public `ux_events` table access, if that old tutorial table exists.

Both sites must deploy their new client code before the SQL migration is applied. Afterward, in SIGNAL select **Observed aggregate** and wait approximately eight seconds for the private-group counts to refresh.

The public dashboard is an **aggregate analytics demonstration**, not a private research portal. At small sample sizes, differences between aggregates may still leak patterns over time; don't store sensitive or real financial data here. Anonymous ingestion remains susceptible to fabricated traffic/abuse. For a production system use authenticated ingestion, real rate limits, retention/deletion procedures, provider security review and user deletion handling.

## Initial setup (new project)

1. Create a Supabase project and run [supabase/nova_schema.sql](supabase/nova_schema.sql) to create the table.
2. Run [supabase/security_hardening.sql](supabase/security_hardening.sql) to install restricted RPCs and grants.
3. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in both sites. The anon/publishable key is intended to be public; **never put a service-role, secret or database password into a VITE_ variable or GitHub**.
4. Deploy the two Vercel apps. Visit NOVA, consent and interact. SIGNAL shows browser-session aggregates once enough sessions are logged.

The legacy [supabase/fix_nova_permissions.sql](supabase/fix_nova_permissions.sql) must **not** be executed; it was used in the original educational version to make rows publicly readable.

## Presentation and research export

Choose **Synthetic demo** to see 196 explicitly fabricated browser sessions. Choose **Observed aggregate** to display restricted metrics computed from consented events. These are different datasets, not a mix.

Click **Replay motion** to repeat 1.45-second KPI count-ups, drawing charts, staggered cards and section funnel reveals. Motion automatically respects operating-system `prefers-reduced-motion: reduce` and the KPI values remain accessible as static screen-reader text.

Under **AI research assistant**, select **Export events (.csv)** or **Download CSV**. The resulting `signal-nova-aggregated.csv` contains **only group-level numerical metrics, section totals and grouped event counts**, without `session_id`, `id`, IP address, or individual browsing history. Upload that CSV to Claude and paste **Copy Claude prompt**. Never claim the result is a formal participant study.

## Run locally and tests

```bash
npm install
npm run dev
npm run build
npm run test:e2e
```

## Remaining caveats

Consent introduces sampling bias. Scroll visibility does not prove attention or comprehension. Anonymous events can be blocked or forged. The per-day cap protects this demo only coarsely. Session totals are not unique people. Formal accessibility conformance requires manual AT/device checks, including reduced motion; these checks are not a substitute for those studies.

© 2026 SIGNAL / NOVA Research Lab
