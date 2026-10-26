# SIGNAL — Product Intelligence Lab

A hands-on Product Design + UX Research + Data Analytics experiment, with a fictional financial-wellness onboarding flow and a reactive KPI dashboard.

**What if we could see how every product interaction shapes an experience — and use AI to ask better research questions?**

SIGNAL demonstrates how a real journey can produce anonymous events, how those events become useful product KPIs, and how AI can support (not replace) human UX research.

> This is a fictional educational prototype, not a banking service or a formal research study. All seeded reference sessions are **synthetic** and always labeled as such.

## Product flow

- **Experience lab:** a three-stage onboarding journey — profile, goals, review — inside a mobile mockup.
- **Event tracking:** `flow_started`, `step_viewed`, `step_completed`, `validation_error`, `flow_completed`, `flow_abandoned`.
- **Analytics overview:** journey starts, completion rate, abandonment rate, mean completion duration, weekly conversion chart, conversion funnel, and event stream.
- **AI research:** rule-based hypotheses, explicit evidence cautions, event export as CSV, and a structured prompt for analysis with Claude.
- **Responsive:** desktop, tablet, and mobile layouts. Keyboard navigation and `prefers-reduced-motion` are supported.

## Stack

React 19 · TypeScript · Vite 6 · CSS · Lucide · Supabase (Postgres + Realtime, optional) · GitHub Actions + Playwright. Claude is used manually for analysis of the exported CSV — **not** silently through a pretend AI API.

## Get started

```bash
npm install
npm run dev
```

Run checks:

```bash
npm run build
npx playwright install chromium
npm run test:e2e
```

## How the realtime data works

1. Interaction with the onboarding prototype generates **real anonymous events** (the action truly occurred, but it is still a demo rather than a study participant).
2. The dashboard updates immediately from the in-browser event store. It also syncs activity between tabs in the same browser.
3. By default, events are stored locally in `localStorage`. No cloud credentials are required for this mode.
4. Optionally connect Supabase to persist events and synchronize them **across different devices and visitors** using Postgres Realtime.
5. A fixed, clearly labeled set of **196 synthetic reference sessions** fills out the initial seven-day chart. Choose **Observed only** to view *only* real interactions with the prototype. Synthetic figures must never be described as research findings.

### Connecting Supabase

1. Create a new free project at https://supabase.com/.
2. Open **SQL Editor** and run the demo-only script in [supabase/schema.sql](supabase/schema.sql).
3. Find your **Project URL** and **publishable/anon key** under project API settings. Never expose a service-role key.
4. Add a local `.env.local` file:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

5. Restart `npm run dev`. On Vercel, define the same environment variables under **Project Settings → Environment Variables** and redeploy.
6. Look for **CLOUD CONNECTED** at the top. Open the prototype in two separate browsers to see cloud synchronization.

**Security note:** The SQL script uses publicly readable and insertable RLS policies solely for the educational demo. It stores only randomly generated session IDs, event type, stage, elapsed duration, and timestamps — **never** entered names, emails, goals, or other personal input. It does not provide authentication, per-user permissions, anti-spam controls, or analytics access controls; therefore it is **not appropriate for production use**.

## Working with Claude

1. Open **AI research assistant** from the left navigation.
2. Click **Export events (.csv)**.
3. Click **Copy Claude prompt**.
4. Open [Claude](https://claude.ai/new), upload the CSV, and paste the prompt.
5. Review the hypotheses critically, verify calculations, and separate observed facts from interpretations.

The prompt is also available in [CLAUDE_PROMPT.md](CLAUDE_PROMPT.md). The app does not directly call Claude APIs and requires no Claude API key.

## Suggested short video (approx. 40 seconds)

- **0–12s:** start the onboarding journey, provoke an intentional validation error, and finish the steps.
- **12–27s:** switch to the dashboard, then select **Observed only** to show the KPIs react.
- **27–40s:** export the events, open Claude, and show a real (not fabricated) AI-assisted interpretation.

## Metric definitions

- **Starts** = number of distinct session IDs containing `flow_started`.
- **Completion rate** = sessions with `flow_completed` / sessions with `flow_started`.
- **Abandonment rate** = sessions with explicit `flow_abandoned` and no completion / started sessions. Open/in-progress sessions are **not** automatically called abandoned.
- **Error frequency** = count of `validation_error` events; the error rate is errors / starts (can exceed 100% if repeated errors are recorded).
- **Average completion time** = mean duration among sessions with `flow_completed` and recorded durations.
- **Funnel** = distinct sessions that completed the profile, goals, and whole flow, respectively, divided by started sessions.

These are **descriptive demo metrics**. Neither correlation nor visualizations alone establish causality or explain motivations.

## Publishing

Connect this GitHub repository to [Vercel](https://vercel.com/new), select the Vite preset, and keep the default build command `npm run build` and output directory `dist`. For cross-browser realtime, connect Supabase first or add the Vercel environment variables later.

---

Built as a portfolio experiment in **UX, Product Analytics, AI-assisted Research and Creative Front-End Development**.
