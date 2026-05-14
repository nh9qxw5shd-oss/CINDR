# CCIL Tracker

Live tile-grid dashboard for tracking active CCIL incidents on shared Control iPads.
Bookmarklet scrapes CCIL → Supabase → realtime PWA.

## Stack

- **DB / backend**: Supabase (project hub instance, ref `ungtmfwxqawkdiflmora`)
- **Ingest**: Supabase Edge Function (Deno)
- **Scrape**: Browser bookmarklet on the CCIL search results page
- **Front-end**: Next.js PWA in [`web/`](./web/), deployed to Vercel, installed via "Add to Home Screen"

## Repo layout

```
ccil-tracker/
├── 001_initial_schema.sql      ← run in SQL editor
├── index.ts                    ← Supabase Edge Function (deploy via CLI or MCP)
├── source.js                   ← readable bookmarklet source
├── bookmarklet.txt             ← minified bookmarklet, paste as bookmark URL
├── web/                        ← Next.js 15 PWA (deploy to Vercel)
│   ├── app/                    ← app-router pages + globals
│   ├── components/             ← RolePicker, KpiBar, TileGrid, Tile, TileSheet
│   ├── lib/                    ← supabase client, hooks, actions
│   ├── public/                 ← manifest + icon
│   └── README.md               ← front-end install + deploy guide
└── README.md                   ← this file
```

## "Vercel deployment downloads a file instead of showing a page"

That happens when Vercel is pointed at the repo root, where `index.ts` is a
Deno **Supabase Edge Function** rather than a website — Vercel serves it as
`application/octet-stream` and the browser downloads it.

The front-end lives in `web/`. In Vercel, set **Root Directory → `web`** and
redeploy (or import the repo again with that setting from the start). See
[`web/README.md`](./web/README.md) for the full deploy walkthrough.

## Deployment — backend

### 1. Schema

Open the Supabase dashboard for project `ungtmfwxqawkdiflmora` → **SQL Editor** →
paste the contents of `001_initial_schema.sql` → **Run**.

This creates:
- `ccil_incidents` (main table)
- `ccil_ownership_log` (audit trail for leaderboard)
- `ccil_scrape_sessions` (diagnostics)
- Enums: `ccil_role`, `ccil_status`, `ccil_action`
- Views: `v_ccil_kpi_summary`, `v_ccil_role_leaderboard`, `v_ccil_tiles`
- `updated_at` trigger

### 2. Edge function

```bash
# Once, if not already done
npm i -g supabase

# In the repo root
supabase login
supabase link --project-ref ungtmfwxqawkdiflmora

# Deploy with JWT verification OFF (anon key in bookmarklet is fine)
supabase functions deploy ccil-ingest --no-verify-jwt
```

The function reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the
Supabase-managed env — no manual secrets needed.

### 3. Realtime

Supabase dashboard → **Database** → **Replication** →
toggle `ccil_incidents` into the `supabase_realtime` publication.
(Needed for the PWA to react to changes without polling.)

### 4. Bookmarklet

Follow `bookmarklet/README.md`.

> **Heads-up on `#` in bookmarklets.** Browsers parse `javascript:` URLs as
> URIs, so the first literal `#` is treated as the fragment delimiter and
> everything after it is dropped — producing a `:` (unexpected token) syntax
> error when the truncated script is parsed. The `bookmarklet.txt` here uses
> `rgb(...)` colours instead of `#hex` for that reason. Don't reintroduce
> `#hex` colours unless you URL-encode them as `%23`.

## Smoke test (before front-end)

After steps 1–4:

1. Click the bookmarklet on the CCIL search results page.
2. Expect orange toast: `SYNC N OK / M LOGS FILTERED`.
3. Supabase dashboard → **Table Editor** → `ccil_incidents` → rows should be present.
4. `ccil_scrape_sessions` should have one new row.
5. Run `select * from v_ccil_kpi_summary;` in SQL editor — should return one row of counts.

If all four pass, backend is good. Front-end comes next.

## Roles

Hardcoded enum on the front-end. Picker on app launch:

```
SNDM, RCM, IC, IC2, TRC, WHTRC, ISC, TSE
```

Selection stored in `localStorage` with an 8-hour TTL.

## Tile actions

- **Take ownership** → sets `owner_role`, `owner_taken_at`, logs `claimed`.
  Conditional update (`WHERE owner_role IS NULL OR owner_role = me`) prevents race conditions.
- **Highlight** → toggles `highlighted` (global flag — visible to everyone).
- **Dismiss** → sets `status = 'dismissed'`, `dismissed_at = now()`.
  If the incident still appears in CCIL after 3 hours, it revives automatically.

## Data flow

```
CCIL page
  │  user clicks bookmarklet (auto-reruns every 60s)
  ▼
Edge Function /ccil-ingest
  │  - filter rolling logs (regex)
  │  - upsert by incident_number (preserves owner/highlight/dismiss state)
  │  - close any active incident missing from scrape
  │  - revive dismissed incidents > 3h old
  │  - log first_seen / reopened / closed events
  ▼
Postgres
  │  Realtime broadcast on UPDATE/INSERT
  ▼
PWA on iPad
   tile grid, KPI bar, role picker, bottom-sheet actions
```

## Next steps

- ~~Front-end: Next.js PWA with Insight design system.~~ Built — see [`web/`](./web/).
- Insight integration: pull `v_ccil_role_leaderboard` directly into Insight.
