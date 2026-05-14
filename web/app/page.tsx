"use client";

import { useMemo, useState } from "react";
import { KpiBar } from "@/components/KpiBar";
import { RolePicker } from "@/components/RolePicker";
import { TileGrid } from "@/components/TileGrid";
import { TileSheet } from "@/components/TileSheet";
import { useIncidents } from "@/lib/useIncidents";
import { useKpi } from "@/lib/useKpi";
import { useRole } from "@/lib/useRole";
import type { Tile } from "@/lib/types";

export default function Page() {
  const { role, setRole, clearRole, hydrated } = useRole();
  const { tiles, loading, error, refresh } = useIncidents();
  const kpiKey = useMemo(
    () => tiles.map((t) => `${t.incident_number}:${t.updated_at}`).join("|"),
    [tiles],
  );
  const kpi = useKpi(kpiKey);

  const [openTile, setOpenTile] = useState<Tile | null>(null);

  if (!hydrated) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <span className="font-mono text-[11px] tracking-wide2 uppercase text-ink-dimmer">
          Loading…
        </span>
      </main>
    );
  }

  if (!role) {
    return <RolePicker onPick={setRole} />;
  }

  // Keep the open-sheet tile in sync with realtime updates.
  const liveOpenTile =
    openTile != null
      ? tiles.find((t) => t.incident_number === openTile.incident_number) ?? openTile
      : null;

  return (
    <main className="min-h-dvh">
      <KpiBar kpi={kpi} role={role} onChangeRole={clearRole} />

      {error && (
        <div className="m-3 md:m-5 font-mono text-[11px] tracking-wide2 uppercase text-signal-red border border-signal-red/40 bg-signal-red/10 px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="px-6 py-20 text-center font-mono text-[11px] tracking-wide2 uppercase text-ink-dimmer">
          Loading tiles…
        </div>
      ) : (
        <TileGrid tiles={tiles} role={role} onPick={setOpenTile} />
      )}

      <TileSheet
        tile={liveOpenTile}
        role={role}
        onClose={() => setOpenTile(null)}
        onChanged={refresh}
      />
    </main>
  );
}
