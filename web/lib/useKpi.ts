"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabase } from "./supabase";
import { KpiSummary } from "./types";

export function useKpi(refreshKey: unknown) {
  const [kpi, setKpi] = useState<KpiSummary | null>(null);
  const supabaseRef = useRef(getSupabase());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabaseRef.current
        .from("v_ccil_kpi_summary")
        .select("*")
        .maybeSingle();
      if (!cancelled) setKpi((data as KpiSummary | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return kpi;
}
