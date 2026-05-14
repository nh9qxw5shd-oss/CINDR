"use client";

import { useEffect, useState } from "react";
import { Role, Tile as TileT } from "@/lib/types";
import {
  claimIncident,
  dismissIncident,
  releaseIncident,
  toggleHighlight,
} from "@/lib/actions";
import { formatDuration, formatRelative } from "@/lib/duration";
import { CornerTicks } from "./CornerTicks";

interface Props {
  tile: TileT | null;
  role: Role;
  onClose: () => void;
  onChanged: () => void;
}

export function TileSheet({ tile, role, onClose, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setBusy(null);
  }, [tile?.incident_number]);

  if (!tile) return null;

  const mine = tile.owner_role === role;
  const someoneElse = !!tile.owner_role && tile.owner_role !== role;

  async function run(label: string, fn: () => Promise<void | { ok: boolean; reason?: string }>) {
    setBusy(label);
    setError(null);
    try {
      const result = await fn();
      if (result && "ok" in result && !result.ok) {
        setError(result.reason ?? "Failed");
      } else {
        onChanged();
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-navy-950/70"
      onClick={onClose}
    >
      <div
        className="sheet-enter w-full max-w-2xl bg-navy-900 border-t border-l border-r border-navy-700 relative corner-ticks text-orange"
        onClick={(e) => e.stopPropagation()}
      >
        <CornerTicks />

        <div className="px-5 md:px-6 pt-5 pb-3">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] tracking-wide2 uppercase text-ink-dimmer">
              {tile.incident_number}
            </span>
            <span className="font-mono text-[11px] text-orange tabular-nums">
              {formatDuration(tile.duration_seconds)} open
            </span>
            {tile.recent_event_flag && (
              <span className="font-mono text-[11px] tracking-wide2 uppercase text-orange">
                · recent event
              </span>
            )}
          </div>
          <div className="mt-2 text-ink font-sans text-lg leading-snug">
            {tile.title || "—"}
          </div>
          <div className="mt-1 font-mono text-[11px] tracking-wide2 uppercase text-ink-dim">
            {tile.from_location || "—"}
            {tile.to_location ? <> &nbsp;→&nbsp; {tile.to_location}</> : null}
          </div>

          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-[11px] tracking-wide2 uppercase">
            <Meta label="Fault" value={tile.fault_number} />
            <Meta label="TDA" value={tile.tda_numbers} />
            <Meta label="Events" value={String(tile.event_count)} />
            <Meta label="Files" value={String(tile.files_count)} />
            <Meta label="Owner" value={tile.owner_role ?? "—"} />
            <Meta
              label="Claimed"
              value={tile.owner_taken_at ? formatRelative(tile.owner_taken_at) : "—"}
            />
            <Meta
              label="Highlighted"
              value={tile.highlighted ? formatRelative(tile.highlighted_at) : "no"}
            />
            <Meta label="First seen" value={formatRelative(tile.first_seen_at)} />
          </div>
        </div>

        {error && (
          <div className="mx-5 md:mx-6 mb-2 font-mono text-[11px] tracking-wide2 uppercase text-signal-red border border-signal-red/40 bg-signal-red/10 px-3 py-2">
            {error}
          </div>
        )}

        <div className="px-3 md:px-4 pb-4 pt-1 grid grid-cols-2 md:grid-cols-4 gap-2">
          {!mine && !someoneElse && (
            <ActionBtn
              busy={busy === "claim"}
              onClick={() => run("claim", () => claimIncident(tile.incident_number, role))}
            >
              Take ownership
            </ActionBtn>
          )}
          {mine && (
            <ActionBtn
              busy={busy === "release"}
              onClick={() => run("release", () => releaseIncident(tile.incident_number, role))}
            >
              Release
            </ActionBtn>
          )}
          {someoneElse && (
            <ActionBtn
              busy={busy === "force-claim"}
              onClick={() => run("force-claim", () => claimIncident(tile.incident_number, role))}
              tone="warn"
            >
              Take from {tile.owner_role}
            </ActionBtn>
          )}
          <ActionBtn
            busy={busy === "highlight"}
            onClick={() =>
              run("highlight", () =>
                toggleHighlight(tile.incident_number, !tile.highlighted, role),
              )
            }
            tone={tile.highlighted ? "on" : undefined}
          >
            {tile.highlighted ? "Un-highlight" : "Highlight"}
          </ActionBtn>
          <ActionBtn
            busy={busy === "dismiss"}
            onClick={() =>
              run("dismiss", () => dismissIncident(tile.incident_number, role))
            }
            tone="warn"
          >
            Dismiss
          </ActionBtn>
          <ActionBtn busy={false} onClick={onClose} tone="ghost">
            Cancel
          </ActionBtn>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-ink-dimmer">{label}</div>
      <div className="text-ink mt-0.5 normal-case">{value || "—"}</div>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  busy,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy: boolean;
  tone?: "warn" | "on" | "ghost";
}) {
  const base =
    "relative font-mono text-xs tracking-wide2 uppercase py-3 border outline-none focus-visible:ring-2 focus-visible:ring-orange disabled:opacity-50";
  const cls =
    tone === "warn"
      ? "border-signal-red/60 text-signal-red hover:bg-signal-red/10"
      : tone === "on"
        ? "border-orange text-navy-950 bg-orange hover:bg-orange-400"
        : tone === "ghost"
          ? "border-navy-700 text-ink-dim hover:text-ink"
          : "border-orange/60 text-orange hover:bg-orange/10";
  return (
    <button onClick={onClick} disabled={busy} className={`${base} ${cls}`}>
      {busy ? "…" : children}
    </button>
  );
}
