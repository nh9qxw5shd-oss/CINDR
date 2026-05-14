"use client";

import { Role, ROLES } from "@/lib/types";
import { CornerTicks } from "./CornerTicks";

interface Props {
  onPick: (role: Role) => void;
}

export function RolePicker({ onPick }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/85 backdrop-blur-sm p-6">
      <div className="relative corner-ticks text-orange w-full max-w-2xl bg-navy-900/95 border border-navy-700 px-8 py-10">
        <CornerTicks />
        <div className="text-ink-dim font-mono text-[11px] tracking-wide2 uppercase">
          CCIL Tracker / Identity
        </div>
        <h1 className="mt-2 font-sans font-medium text-2xl text-ink">
          Who's at this iPad?
        </h1>
        <p className="mt-1 text-ink-dim text-sm">
          Selection is stored on this device for 8 hours.
        </p>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => onPick(r)}
              className="relative corner-ticks text-orange/60 hover:text-orange focus:text-orange transition-colors py-5 bg-navy-800 hover:bg-navy-700 border border-navy-700 font-mono text-ink text-sm tracking-wide2 uppercase outline-none focus-visible:ring-2 focus-visible:ring-orange"
            >
              <CornerTicks />
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
