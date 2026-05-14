// ============================================================================
// CCIL Sync Bookmarklet — source
// Runs on https://safe.networkrail.co.uk/CCIL/.../IncidentSearchResults.aspx
// Scrapes the incident table, POSTs to Supabase Edge Function, auto-reruns.
// ============================================================================

(() => {
  const EDGE_URL = "https://ungtmfwxqawkdiflmora.supabase.co/functions/v1/ccil-ingest";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuZ3RtZnd4cWF3a2RpZmxtb3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMDY4NjQsImV4cCI6MjA3NzY4Mjg2NH0.Yaq0XfbbkwxJDUoiPCS7bLVBy70Wa-NOOWIxkpRRxdc";
  const AUTO_REFRESH_SECONDS = 60;

  // -------------------------------------------------------------------------
  // Toast
  // -------------------------------------------------------------------------
  function toast(msg, type) {
    const el = document.createElement("div");
    el.textContent = msg;
    // NOTE: do NOT use #hex colours in a bookmarklet — browsers treat the first
    // `#` as the URL fragment delimiter and chop the rest of the script off.
    el.style.cssText =
      "position:fixed;bottom:20px;right:20px;padding:10px 16px;" +
      "background:" + (type === "err" ? "rgb(231,76,60)" : "rgb(224,82,6)") + ";" +
      "color:rgb(255,255,255);font-family:Menlo,Consolas,monospace;font-size:12px;" +
      "z-index:99999;border-radius:3px;letter-spacing:.5px;" +
      "box-shadow:0 4px 20px rgba(0,0,0,.4);text-transform:uppercase;";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  // -------------------------------------------------------------------------
  // Date parser: "31/12/2026 23:59" -> ISO UTC
  // -------------------------------------------------------------------------
  function parseUkDate(s) {
    if (!s || s.trim() === "" || s === "\u00a0") return null;
    const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
    if (!m) return null;
    return m[3] + "-" + m[2] + "-" + m[1] + "T" + m[4] + ":" + m[5] + ":00Z";
  }

  function cellText(cells, i) {
    return (cells[i]?.textContent ?? "").replace(/\u00a0/g, "").trim();
  }

  // -------------------------------------------------------------------------
  // Scrape
  // -------------------------------------------------------------------------
  function scrape() {
    const table = document.querySelector("table.rgMasterTable");
    if (!table) return null;

    const rows = table.querySelectorAll("tr.rgRow, tr.rgAltRow");
    const out = [];

    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 11) return;

      const incidentNumber =
        cells[2]?.querySelector("a")?.textContent?.trim() ?? "";
      if (!incidentNumber) return;

      const eventsText = cellText(cells, 9);
      const filesText = cellText(cells, 10);
      const recentEvent = !!cells[8]?.querySelector("img");

      out.push({
        incident_number: incidentNumber,
        start_datetime: parseUkDate(cellText(cells, 0)),
        from_location: cellText(cells, 3),
        to_location: cellText(cells, 4),
        title: cellText(cells, 5),
        fault_number: cellText(cells, 6),
        tda_numbers: cellText(cells, 7),
        event_count: parseInt(eventsText, 10) || 0,
        files_count: parseInt(filesText, 10) || 0,
        recent_event_flag: recentEvent,
      });
    });

    return out;
  }

  // -------------------------------------------------------------------------
  // Sync
  // -------------------------------------------------------------------------
  async function sync() {
    const incidents = scrape();
    if (incidents === null) {
      toast("CCIL table not found — wrong page?", "err");
      return;
    }

    try {
      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + ANON_KEY,
          "apikey": ANON_KEY,
        },
        body: JSON.stringify({ incidents }),
      });
      const data = await res.json();
      if (data.ok) {
        toast(
          "Sync " + data.processed + " ok / " + data.filtered_out + " logs filtered",
          "ok",
        );
      } else {
        toast("Sync failed: " + (data.error || "unknown"), "err");
      }
    } catch (err) {
      toast("Network error: " + err.message, "err");
    }
  }

  // -------------------------------------------------------------------------
  // Boot — kill any previous interval, run once, set new interval
  // -------------------------------------------------------------------------
  if (window.__ccilSyncInterval) {
    clearInterval(window.__ccilSyncInterval);
    toast("Existing sync stopped — restarting", "ok");
  }

  sync();
  window.__ccilSyncInterval = setInterval(sync, AUTO_REFRESH_SECONDS * 1000);
  setTimeout(() => {
    toast("Auto-sync ON every " + AUTO_REFRESH_SECONDS + "s", "ok");
  }, 500);
})();
