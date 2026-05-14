"use client";

import { KpiSummary, Role } from "@/lib/types";
import { formatDuration } from "@/lib/duration";

interface Props {
  kpi: KpiSummary | null;
  role: Role;
  onChangeRole: () => void;
}

function Stat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[10px] tracking-wide2 uppercase text-ink-dimmer">
        {label}
      </span>
      <span
        className={
          "font-mono text-xl leading-none mt-1 " +
          (accent ? "text-orange" : "text-ink")
        }
      >
        {value}
      </span>
    </div>
  );
}

export function KpiBar({ kpi, role, onChangeRole }: Props) {
  return (
    <header className="border-b border-navy-700 bg-navy-900/70 backdrop-blur supports-[backdrop-filter]:bg-navy-900/55 sticky top-0 z-30">
      <div className="px-4 md:px-6 py-3 flex items-center gap-4 md:gap-8 overflow-x-auto">
        <div className="flex items-center gap-3 shrink-0">
          <span className="block w-2 h-2 bg-orange recent-pulse rounded-[1px]" />
          <span className="font-sans font-medium text-ink tracking-wide2 uppercase text-sm">
            CCIL Tracker
          </span>
        </div>

        <div className="flex items-center gap-6 md:gap-10">
          <Stat label="Active" value={kpi?.total_active ?? "—"} accent />
          <Stat label="Unclaimed" value={kpi?.unclaimed ?? "—"} />
          <Stat label="Owned" value={kpi?.owned ?? "—"} />
          <Stat label="Highlighted" value={kpi?.highlighted ?? "—"} />
          <Stat label="Recent ev." value={kpi?.with_recent_events ?? "—"} />
          <Stat
            label="Longest open"
            value={
              kpi?.longest_open_seconds != null
                ? formatDuration(kpi.longest_open_seconds)
                : "—"
            }
          />
        </div>

        <button
          onClick={onChangeRole}
          className="ml-auto shrink-0 font-mono text-xs tracking-wide2 uppercase text-ink-dim hover:text-orange border border-navy-700 px-3 py-1.5"
        >
          {role} ▾
        </button>
      </div>
    </header>
  );
}
