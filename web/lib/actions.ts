"use client";

import { getSupabase } from "./supabase";
import { Role } from "./types";

// Conditional claim: only succeeds if no current owner OR the caller already owns it.
// Returns true if the row was actually updated.
export async function claimIncident(
  incidentNumber: string,
  role: Role,
): Promise<{ ok: boolean; reason?: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("ccil_incidents")
    .update({ owner_role: role, owner_taken_at: new Date().toISOString() })
    .eq("incident_number", incidentNumber)
    .or(`owner_role.is.null,owner_role.eq.${role}`)
    .select("incident_number")
    .maybeSingle();

  if (error) return { ok: false, reason: error.message };
  if (!data) return { ok: false, reason: "Already owned by someone else" };

  await supabase
    .from("ccil_ownership_log")
    .insert({ incident_number: incidentNumber, role, action: "claimed" });
  return { ok: true };
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
