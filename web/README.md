# CCIL Tracker — front-end

Next.js 15 + Tailwind PWA for the shared-iPad tile grid. Reads `v_ccil_tiles`
and `v_ccil_kpi_summary` from Supabase, subscribes to realtime changes on
`ccil_incidents`, and writes ownership/highlight/dismiss back through the
same anon key the bookmarklet uses.

## Local dev

```bash
cd web
cp .env.local.example .env.local       # already populated with project URL + anon key
npm install
npm run dev                             # http://localhost:3000
```

## Deploy to Vercel

1. **Vercel → Add New → Project → Import this repo.**
2. Set **Root Directory** to `web`.
3. Framework preset is auto-detected as Next.js.
4. Add two environment variables (same names + values as `.env.local.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy. The first deploy will give you `https://<project>.vercel.app`.

> If you previously deployed the repo to Vercel with no root directory set and
> got a file download instead of a page, that's because Vercel was being pointed
> at the Supabase Edge Function (`/index.ts`) at the repo root. Setting Root
> Directory to `web` fixes it.

## Install on iPad

1. Open the Vercel URL in Safari on the iPad.
2. Share → **Add to Home Screen**.
3. Launch from the home-screen icon — it runs full-screen with the dark-navy
   theme, no Safari chrome. Landscape is the default.

## How the UI is wired

| Concern             | File                                  |
| ------------------- | ------------------------------------- |
| Role gate (8h TTL)  | `lib/useRole.ts` → `components/RolePicker.tsx` |
| Tile data + realtime| `lib/useIncidents.ts`                 |
| KPI bar             | `lib/useKpi.ts` → `components/KpiBar.tsx` |
| Tile actions        | `lib/actions.ts` (claim / release / highlight / dismiss) |
| Bottom-sheet UI     | `components/TileSheet.tsx`            |
| Insight styling     | `app/globals.css` + `tailwind.config.ts` |

### Claim race protection

`claimIncident` does a conditional update — `owner_role IS NULL OR owner_role = me` —
so two roles tapping at the same time can't both win. If the row's already
owned by someone else, the call returns `{ ok: false }` and the UI surfaces
"Already owned by someone else". The bottom-sheet offers a separate
"Take from X" button for explicit hand-offs.

### Tile colour cues

- Dim border → unclaimed.
- Blue text → owned by another role.
- Orange-dim → owned by you.
- Solid orange + pulse → highlighted.
- Pulsing border ring → CCIL flagged a recent event.
