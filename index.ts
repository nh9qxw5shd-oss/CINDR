// ============================================================================
// CCIL Ingest — Supabase Edge Function
//
// Receives scraped incidents from the bookmarklet, applies filter + dedupe +
// dismiss-revival logic, marks missing incidents as closed, logs everything.
//
// Deploy:  supabase functions deploy ccil-ingest --no-verify-jwt
// Invoke:  POST {project}.supabase.co/functions/v1/ccil-ingest
//          headers: { apikey, Authorization: Bearer <anon_key> }
//          body:    { incidents: ScrapedIncident[] }
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Titles matching this regex are rolling logs, not incidents — discarded.
const LOG_FILTER = /\b(log|monitoring|tips|migration)\b/i;

// Dismissed incidents revive if still being scraped after this many hours.
const DISMISS_REVIVAL_HOURS = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScrapedIncident {
  incident_number: string;
  start_datetime: string | null;
  from_location: string;
  to_location: string;
  title: string;
  fault_number: string;
  tda_numbers: string;
  event_count: number;
  files_count: number;
  recent_event_flag: boolean;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const incomingRaw: ScrapedIncident[] = Array.isArray(body?.incidents)
      ? body.incidents
      : [];
    const userAgent = req.headers.get("user-agent") ?? "";

    // ---- 1. Filter rolling logs --------------------------------------------
    const incidents = incomingRaw.filter(
      (i) => i.incident_number && !LOG_FILTER.test(i.title ?? ""),
    );
    const filteredCount = incomingRaw.length - incidents.length;
    const scrapedSet = new Set(incidents.map((i) => i.incident_number));
    const now = new Date().toISOString();

    // ---- 2. Fetch existing rows for the scraped set (one query) ------------
    const incidentNumbers = Array.from(scrapedSet);
    const { data: existingRows, error: fetchErr } = incidentNumbers.length > 0
      ? await supabase
        .from("ccil_incidents")
        .select("incident_number, status, dismissed_at, owner_role, highlighted")
        .in("incident_number", incidentNumbers)
      : { data: [], error: null };

    if (fetchErr) throw fetchErr;
    const existingMap = new Map(
      (existingRows ?? []).map((r: any) => [r.incident_number, r]),
    );

    // ---- 3. Build upsert rows, preserving human state + handling revival ---
    const upsertRows: any[] = [];
    const reopened: string[] = [];
    const firstSeen: string[] = [];

    for (const inc of incidents) {
      const existing = existingMap.get(inc.incident_number);

      let nextStatus: "active" | "closed" | "dismissed" = "active";
      let nextDismissedAt: string | null = null;

      if (existing) {
        if (existing.status === "dismissed") {
          const dismissedAt = existing.dismissed_at
            ? new Date(existing.dismissed_at).getTime()
            : 0;
          const hoursSince = (Date.now() - dismissedAt) / 3_600_000;
          if (hoursSince >= DISMISS_REVIVAL_HOURS) {
            nextStatus = "active";
            nextDismissedAt = null;
            reopened.push(inc.incident_number);
          } else {
            nextStatus = "dismissed";
            nextDismissedAt = existing.dismissed_at;
          }
        } else {
          // closed -> active again (it came back), or already active
          nextStatus = "active";
        }
      } else {
        firstSeen.push(inc.incident_number);
      }

      upsertRows.push({
        incident_number: inc.incident_number,
        start_datetime: inc.start_datetime,
        from_location: inc.from_location,
        to_location: inc.to_location,
        title: inc.title,
        fault_number: inc.fault_number,
        tda_numbers: inc.tda_numbers,
        event_count: inc.event_count,
        files_count: inc.files_count,
        recent_event_flag: inc.recent_event_flag,
        status: nextStatus,
        dismissed_at: nextDismissedAt,
        last_seen_at: now,
        raw_payload: inc,
      });
    }

    // ---- 4. Upsert ---------------------------------------------------------
    if (upsertRows.length > 0) {
      const { error: upsertErr } = await supabase
        .from("ccil_incidents")
        .upsert(upsertRows, { onConflict: "incident_number" });
      if (upsertErr) throw upsertErr;
    }

    // ---- 5. Close any active incident that wasn't in this scrape -----------
    const { data: currentActive } = await supabase
      .from("ccil_incidents")
      .select("incident_number")
      .eq("status", "active");

    const toClose = (currentActive ?? [])
      .map((r: any) => r.incident_number)
      .filter((n: string) => !scrapedSet.has(n));

    if (toClose.length > 0) {
      await supabase
        .from("ccil_incidents")
        .update({ status: "closed", last_seen_at: now })
        .in("incident_number", toClose);
    }

    // ---- 6. Audit log entries ----------------------------------------------
    const logRows: any[] = [
      ...firstSeen.map((n) => ({ incident_number: n, action: "first_seen" })),
      ...reopened.map((n) => ({ incident_number: n, action: "reopened" })),
      ...toClose.map((n) => ({ incident_number: n, action: "closed" })),
    ];

    if (logRows.length > 0) {
      await supabase.from("ccil_ownership_log").insert(logRows);
    }

    // ---- 7. Session record -------------------------------------------------
    const { data: session } = await supabase
      .from("ccil_scrape_sessions")
      .insert({
        incident_count: incomingRaw.length,
        filtered_count: filteredCount,
        closed_count: toClose.length,
        revived_count: reopened.length,
        user_agent: userAgent,
      })
      .select()
      .single();

    return json({
      ok: true,
      session_id: session?.id,
      scraped: incomingRaw.length,
      processed: incidents.length,
      filtered_out: filteredCount,
      new: firstSeen.length,
      reopened: reopened.length,
      closed: toClose.length,
    });
  } catch (err) {
    console.error("ccil-ingest error:", err);
    return json({ ok: false, error: String(err?.message ?? err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
