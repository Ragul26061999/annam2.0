/**
 * useLocalFirst — local-first data loading hook
 *
 * Pattern:
 *   1. Immediately return cached data from SQLite (instant render)
 *   2. Fire a Supabase query in background
 *   3. When Supabase resolves, update state + write back to SQLite cache
 *
 * Usage:
 *   const { data, loading, refreshing, refresh } = useLocalFirst({
 *     cacheKey: "medications",
 *     localQuery: () => getCachedItems("medications"),
 *     remoteQuery: () => supabase.from("medications").select("*"),
 *     onRemoteData: (rows) => cacheItems("medications", rows),
 *   });
 */

import { useState, useEffect, useCallback, useRef } from "react";

export type LocalFirstStatus = "idle" | "loading" | "refreshing" | "done" | "error";

interface UseLocalFirstOptions<T> {
  /** Unique key — prevents double-fetching across re-renders */
  cacheKey: string;
  /** Reads from local SQLite — called first, must be fast */
  localQuery: () => Promise<T[]>;
  /** Reads from Supabase — called in background */
  remoteQuery: () => Promise<{ data: T[] | null; error: unknown }>;
  /** Optional: write remote data back to local cache */
  onRemoteData?: (rows: T[]) => Promise<void>;
  /** Skip the remote fetch (e.g. when offline) */
  skipRemote?: boolean;
  /** Transform rows before setting state */
  transform?: (rows: T[]) => T[];
}

interface UseLocalFirstResult<T> {
  data: T[];
  /** True only during the very first load before ANY data available */
  loading: boolean;
  /** True while background Supabase fetch is running */
  refreshing: boolean;
  status: LocalFirstStatus;
  error: string | null;
  /** Manually trigger a fresh Supabase fetch */
  refresh: () => void;
}

// In-memory dedupe registry so two components mounting at the same time
// don't fire two identical remote requests.
const inFlightKeys = new Set<string>();

export function useLocalFirst<T = Record<string, unknown>>({
  cacheKey,
  localQuery,
  remoteQuery,
  onRemoteData,
  skipRemote = false,
  transform,
}: UseLocalFirstOptions<T>): UseLocalFirstResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);   // first-paint loading
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<LocalFirstStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const applyTransform = useCallback(
    (rows: T[]) => (transform ? transform(rows) : rows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const fetchLocal = useCallback(async () => {
    try {
      const rows = await localQuery();
      if (mounted.current) {
        setData(applyTransform(rows));
      }
      return rows.length > 0;
    } catch {
      return false;
    }
  }, [localQuery, applyTransform]);

  const fetchRemote = useCallback(async () => {
    if (inFlightKeys.has(cacheKey)) return;
    inFlightKeys.add(cacheKey);
    if (mounted.current) setRefreshing(true);

    try {
      const { data: rows, error: err } = await remoteQuery();
      if (!mounted.current) return;

      if (err) {
        setError(String(err));
        setStatus("error");
        return;
      }

      const fresh = rows ?? [];
      setData(applyTransform(fresh));
      setStatus("done");

      if (onRemoteData && fresh.length > 0) {
        await onRemoteData(fresh);
      }
    } catch (e) {
      if (mounted.current) {
        setError(String(e));
        setStatus("error");
      }
    } finally {
      inFlightKeys.delete(cacheKey);
      if (mounted.current) setRefreshing(false);
    }
  }, [cacheKey, remoteQuery, onRemoteData, applyTransform]);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);

    // 1. Load local cache — unblocks the UI immediately
    const hasLocal = await fetchLocal();
    if (mounted.current) setLoading(false);

    // 2. Fetch remote in background
    if (!skipRemote) {
      void fetchRemote();
    } else if (!hasLocal) {
      setStatus("done");
    }
  }, [fetchLocal, fetchRemote, skipRemote]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return {
    data,
    loading,
    refreshing,
    status,
    error,
    refresh: fetchRemote,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
 * Simpler one-shot helper for components that don't need the hook:
 *   const meds = await loadLocalFirst("medications", localQuery, remoteQuery)
 * ─────────────────────────────────────────────────────────────────────────*/
export async function loadLocalFirst<T>(
  localQuery: () => Promise<T[]>,
  remoteQuery: () => Promise<{ data: T[] | null; error: unknown }>,
  onRemoteData?: (rows: T[]) => Promise<void>
): Promise<{ cached: T[]; fresh: Promise<T[]> }> {
  const cached = await localQuery().catch(() => [] as T[]);

  const fresh = remoteQuery().then(async ({ data }) => {
    const rows = data ?? [];
    if (onRemoteData && rows.length) await onRemoteData(rows);
    return rows;
  });

  return { cached, fresh };
}
