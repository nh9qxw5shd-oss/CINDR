"use client";

import { useCallback, useEffect, useState } from "react";
import { Role, ROLES } from "./types";

const STORAGE_KEY = "ccil.role";
const TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

interface Stored {
  role: Role;
  expires_at: number;
}

function readStored(): Role | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.role || !ROLES.includes(parsed.role)) return null;
    if (typeof parsed.expires_at !== "number" || Date.now() > parsed.expires_at) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.role;
  } catch {
    return null;
  }
}

export function useRole() {
  const [role, setRoleState] = useState<Role | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setRoleState(readStored());
    setHydrated(true);
  }, []);

  const setRole = useCallback((next: Role) => {
    const value: Stored = { role: next, expires_at: Date.now() + TTL_MS };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    setRoleState(next);
  }, []);

  const clearRole = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setRoleState(null);
  }, []);

  return { role, setRole, clearRole, hydrated };
}
