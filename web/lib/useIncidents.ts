"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "./supabase";
import { Tile } from "./types";

interface State {
  tiles: Tile[];
  loading: boolean;
  error: string | null;
}

export function useIncidents() {
  const [state, setState] = useState<State>({
    tiles: [],
    loading: true,
    error: null,
  });
  const supabaseRef = useRef(getSupabase());

  const refresh = useCallback(async () => {
    const { data, error } = await supabaseRef.current
      .from("v_ccil_tiles")
      .select("*")
      .order("highlighted", { ascending: false })
      .order("recent_event_flag", { ascending: false })
      .order("start_datetime", { ascending: true, nullsFirst: false });

    if (error) {
      setState((s) => ({ ...s, loading: false, error: error.message }));
      return;
    }
    setState({ tiles: (data ?? []) as Tile[], loading: false, error: null });
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabaseRef.current
      .channel("ccil_incidents_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ccil_incidents" },
        () => {
          refresh();
        },
      )
      .subscribe();

    // Light-touch polling fallback in case the realtime socket drops.
    const poll = window.setInterval(refresh, 30_000);

    return () => {
      window.clearInterval(poll);
      supabaseRef.current.removeChannel(channel);
    };
  }, [refresh]);

  return { ...state, refresh };
}
