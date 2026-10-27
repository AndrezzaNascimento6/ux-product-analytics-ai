# SIGNAL × NOVA — Product Intelligence Lab

**One product, two perspectives:** [NOVA](https://wandr-3d-travel-experience.vercel.app/) is a fictional banking experience; SIGNAL is the dashboard for studying its **consented, anonymous interactions**.

Product Design · UX Research · motion accessibility · event instrumentation · Product Analytics · AI-assisted analysis.

## What is measured

- Opt-in starts of NOVA sessions and sections reached: introduction, signature card, security, wealth, worldwide, benefits, app.
- Navigation, modal and benefit interactions.
- Motion-control changes (the event does **not** disclose disability or preference direction).
- Fictional banking-app tabs, demo top-ups, card freeze changes and completed **simulated** transfers.
- Device category based on viewport width and duration for sessions where an end event is recorded.

**Not collected:** names, emails, transfer amounts, demo balances, typed information, real financial data, IP addresses in application event fields, personal identifiers or authentication information. The service receiving requests may independently process network metadata. Consent can be declined without losing any NOVA feature.

## Data integrity

The initial charts include **196 explicitly synthetic reference sessions**, solely for illustrating the UI. Choose **Observed only** to show consented NOVA interactions. If the database is unconfigured, Observed only correctly shows zero sessions.

No "conversion to paying customers" can be calculated: NOVA is not a real bank. Page reach ≠ comprehension or satisfaction. Neither scroll exit nor a missing event proves abandonment. Claimed insights must be checked against the actual exported rows.

## Stack

React 19, TypeScript, Vite, Lucide, Supabase Postgres + Realtime (optional), Playwright and Claude (manual CSV interpretation).

## Run locally

```bash
npm install
npm run dev
npm run build
npm run test:e2e
```

## Set up real-time NOVA → SIGNAL telemetry

1. Create one Supabase project at <https://supabase.com>.
2. Open SQL Editor and execute [supabase/nova_schema.sql](supabase/nova_schema.sql). **This is an intentionally open educational demo schema; do not use it for production or sensitive analytics.**
3. Copy its **Project URL** and **public publishable/anon key** (never the service-role secret).
4. In **both** NOVA and SIGNAL Vercel projects, set these exact build-time variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Redeploy **both** projects. Accept anonymous analytics on NOVA before testing. Open SIGNAL → **Observed only** and look for **CLOUD CONNECTED**.
6. Try NOVA on another device. Events should appear on SIGNAL after insertion and Realtime delivery. If they do not, check Supabase policies, publication and browser console errors.

For local development, add the two keys to `.env.local` in each repository. Both repos are connected to the **same Supabase project and `nova_events` table**.

Public anon read/insert policies in this demo mean anyone with the public key can read or submit pseudonymous event rows. Do not make claims of secure private analytics or real-user studies. A future production version would require hardened write ingestion, access-controlled aggregate views, limits, retention and a privacy review.

## Analyze with Claude

1. Open SIGNAL → AI research assistant.
2. Choose **Observed only** for genuine consented sessions (or retain All data but label synthetic rows as reference).
3. Export `signal-nova-events.csv` and copy the structured research prompt.
4. Upload CSV to <https://claude.ai/new> and paste the prompt.
5. Verify every computed statistic, and validate all hypotheses with actual user research before claiming findings.

Claude is a **human-in-the-loop analysis step**, not an embedded live API integration.

## Suggested portfolio video (~40 seconds)

- 0–15s: NOVA cinematic scroll, accessible reduced-motion control, a demo banking interaction.
- 15–28s: SIGNAL's **Observed only** dashboard updates from consented events.
- 28–40s: Export CSV, paste into Claude and show an actual analysis with limitations.

## Important limitations

This is a portfolio experiment. Consent introduces sampling bias, data can be blocked, and browser end events can be missing. Section observations capture discoverability, not users' motivations. Synthetic data are illustrative, not study results. Manual accessibility and usability testing are still needed.

© 2026 SIGNAL / NOVA Research Lab


## Fix: 'Supabase connection error' / no observed events

If you created the Supabase project with **Automatically expose new tables** disabled, the table's RLS policies are not sufficient. The database role `anon` also needs the explicit, minimal privileges `SELECT` and `INSERT`.

Open your **nova-analytics → SQL Editor** and run [supabase/fix_nova_permissions.sql](supabase/fix_nova_permissions.sql) once. The script grants only those two operations to `anon` and asks PostgREST to refresh its schema; it doesn't delete rows or change the table structure.

Then refresh both sites. SIGNAL tries Supabase Realtime and falls back to reading new events every 12 seconds. On NOVA, previously consented anonymous events held locally can be retried after the database access is repaired.

Do not enable automatic public access to every new table just for this fix; keep least-privilege grants per table.
