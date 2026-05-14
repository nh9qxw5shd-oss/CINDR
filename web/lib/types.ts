export const ROLES = [
  "SNDM",
  "RCM",
  "IC",
  "IC2",
  "TRC",
  "WHTRC",
  "ISC",
  "TSE",
] as const;

export type Role = (typeof ROLES)[number];

export type IncidentStatus = "active" | "closed" | "dismissed";

export interface Tile {
  incident_number: string;
  start_datetime: string | null;
  from_location: string | null;
  to_location: string | null;
  title: string | null;
  fault_number: string | null;
  tda_numbers: string | null;
  event_count: number;
  files_count: number;
  recent_event_flag: boolean;
  status: IncidentStatus;
  owner_role: Role | null;
  owner_taken_at: string | null;
  highlighted: boolean;
  highlighted_at: string | null;
  dismissed_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
  duration_seconds: number | null;
}

export interface KpiSummary {
  total_active: number;
  owned: number;
  unclaimed: number;
  highlighted: number;
  with_recent_events: number;
  longest_open_seconds: number | null;
}
