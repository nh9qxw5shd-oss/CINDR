# CCIL Sync Bookmarklet

## Install (one-time, per browser)

1. Bookmark any page (Ctrl+D or drag the URL to the bookmarks bar).
2. Right-click the new bookmark → **Edit**.
3. Name it `CCIL Sync`.
4. Replace the URL with the entire single line from `bookmarklet.txt`.
5. Save.

> Note: some browsers strip `javascript:` from pasted URLs as a security measure.
> If that happens, type `javascript:` manually at the start, then paste the rest.

## Use

1. Log in to CCIL and run any search that gets you to **Incident Search Results**.
2. Click the `CCIL Sync` bookmark.
3. You should see an orange toast bottom-right: `SYNC N OK / M LOGS FILTERED`.
4. The bookmarklet then auto-reruns every **60 seconds** as long as the CCIL tab stays open.

To stop: close the CCIL tab, or click the bookmarklet again (it'll show "Existing sync stopped — restarting").

## What it does

- Scrapes every row in the search results table (`tr.rgRow`, `tr.rgAltRow`).
- Pulls: incident number, start time, locations, title, fault number, TDA numbers, event count, files count, "recent event" icon flag.
- POSTs the array to the `ccil-ingest` edge function.
- The edge function filters rolling logs (titles matching `/\b(log|monitoring|tips|migration)\b/i`), upserts the rest, and marks any previously-active incident no longer in the scrape as `closed`.

## Troubleshooting

| Toast | Meaning |
|---|---|
| `CCIL table not found — wrong page?` | You're not on the search results page. Run a search first. |
| `Network error: ...` | Bookmarklet couldn't reach Supabase. Check VPN / network. |
| `Sync failed: ...` | Edge function returned an error. Check Supabase function logs. |

## Modifying

- Edit `source.js`, then re-minify into `bookmarklet.txt`.
- Quick way: paste `source.js` into a JS minifier (e.g. terser), wrap result in `javascript:(()=>{...})();void 0;`.
- Or: keep the manual minification in `bookmarklet.txt` and just edit it directly — it's not big.
