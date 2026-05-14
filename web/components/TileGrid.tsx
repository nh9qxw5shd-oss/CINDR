"use client";

import { Role, Tile as TileT } from "@/lib/types";
import { Tile } from "./Tile";

interface Props {
  tiles: TileT[];
  role: Role;
  onPick: (tile: TileT) => void;
}

export function TileGrid({ tiles, role, onPick }: Props) {
  if (tiles.length === 0) {
    return (
      <div className="px-6 py-20 text-center">
        <div className="font-mono text-[11px] tracking-wide2 uppercase text-ink-dimmer">
          No active incidents
        </div>
        <div className="mt-2 text-ink-dim text-sm">
          Either CCIL is quiet, or the bookmarklet hasn't synced yet.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {tiles.map((t) => (
        <Tile
          key={t.incident_number}
          tile={t}
          role={role}
          onClick={() => onPick(t)}
        />
      ))}
    </div>
  );
}
