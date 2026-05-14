"use client";

import { Role, Tile as TileT } from "@/lib/types";
import { formatDuration } from "@/lib/duration";
import { CornerTicks } from "./CornerTicks";

interface Props {
  tile: TileT;
  role: Role;
  onClick: () => void;
}

function tileTone(tile: TileT, role: Role): string {
  if (tile.highlighted) return "border-orange text-orange";
  if (tile.owner_role && tile.owner_role !== role) return "border-navy-600 text-signal-blue";
  if (tile.owner_role === role) return "border-orange/70 text-orange/80";
  return "border-navy-700 text-ink-dim";
}

export function Tile({ tile, role, onClick }: Props) {
  const tone = tileTone(tile, role);
  const owned = !!tile.owner_role;
  const minePending = tile.owner_role && tile.owner_role !== role;

  return (
    <button
      onClick={onClick}
      className={
        "group relative corner-ticks text-left bg-navy-900/80 border " +
        tone +
        " p-3 md:p-4 flex flex-col gap-2 outline-none focus-visible:ring-2 focus-visible:ring-orange" +
        (tile.recent_event_flag ? " recent-pulse" : "")
      }
    >
      <CornerTicks />

      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] tracking-wide2 uppercase text-ink-dimmer">
          {tile.incident_number}
        </span>
        <span className="font-mono text-[11px] text-orange tabular-nums">
          {formatDuration(tile.duration_seconds)}
        </span>
      </div>

      <div className="font-sans text-ink text-sm leading-snug line-clamp-2 min-h-[2.4em]">
        {tile.title || "—"}
      </div>

      <div className="font-mono text-[11px] text-ink-dim uppercase tracking-wide2 line-clamp-1">
        {tile.from_location || "—"}
        {tile.to_location ? <> &nbsp;→&nbsp; {tile.to_location}</> : null}
      </div>

      <div className="mt-auto flex items-center justify-between font-mono text-[10px] tracking-wide2 uppercase">
        <span className="text-ink-dimmer">
          {tile.fault_number ? `F ${tile.fault_number}` : ""}
          {tile.fault_number && tile.tda_numbers ? " · " : ""}
          {tile.tda_numbers ? `T ${tile.tda_numbers}` : ""}
        </span>
        <span className="flex items-center gap-2">
          {tile.event_count > 0 && (
            <span className="text-ink-dim">{tile.event_count}e</span>
          )}
          {tile.files_count > 0 && (
            <span className="text-ink-dim">{tile.files_count}f</span>
          )}
          {owned && (
            <span className={minePending ? "text-signal-blue" : "text-orange"}>
              {tile.owner_role}
            </span>
          )}
          {tile.highlighted && <span className="text-orange">★</span>}
        </span>
      </div>
    </button>
  );
}
