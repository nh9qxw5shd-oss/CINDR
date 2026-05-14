"use client";

import { getSupabase } from "./supabase";
import { Role } from "./types";

// Atomic claim via SQL function. `force = true` overrides an existing owner;
// otherwise the claim only succeeds if the row is unclaimed or already mine.
export async function claimIncident(
  incidentNumber: string,
  role: Role,
  force = false,
): Promise<{ ok: boolean; reason?: string; owner?: Role }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("claim_ccil_incident", {
    p_incident_number: incidentNumber,
    p_claimer: role,
    p_force: force,
  });
  if (error) return { ok: false, reason: error.message };
  return data as { ok: boolean; reason?: string; owner?: Role };
}

export async function releaseIncident(incidentNumber: string, role: Role) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("ccil_incidents")
    .update({ owner_role: null, owner_taken_at: null })
    .eq("incident_number", incidentNumber)
    .eq("owner_role", role);
  if (error) throw new Error(error.message);

  await supabase
    .from("ccil_ownership_log")
    .insert({ incident_number: incidentNumber, role, action: "released" });
}

export async function toggleHighlight(
  incidentNumber: string,
  next: boolean,
  role: Role | null,
) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("ccil_incidents")
    .update({
      highlighted: next,
      highlighted_at: next ? new Date().toISOString() : null,
    })
    .eq("incident_number", incidentNumber);
  if (error) throw new Error(error.message);

  await supabase.from("ccil_ownership_log").insert({
    incident_number: incidentNumber,
    role,
    action: next ? "highlighted" : "unhighlighted",
  });
}

export async function dismissIncident(incidentNumber: string, role: Role | null) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("ccil_incidents")
    .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
    .eq("incident_number", incidentNumber);
  if (error) throw new Error(error.message);

  await supabase
    .from("ccil_ownership_log")
    .insert({ incident_number: incidentNumber, role, action: "dismissed" });
}
