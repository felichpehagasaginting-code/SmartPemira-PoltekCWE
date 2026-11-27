"use client";

// Hook polling dengan In-Memory SWR Cache, request deduplication,
// dan visibility-aware pausing agar perpindahan menu instan (0 ms)
// serta hemat rows-read database.
import { useCallback, useEffect, useRef, useState } from "react";

interface CacheEntry {
  data: unknown;
  raw: string;
  updatedAt: number;
}

const swrCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<CacheEntry>>();

async function fetchWithDedup(url: string): Promise<CacheEntry> {
  const existing = inFlight.get(url);
  if (existing) return existing;

  const promise = (async () => {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.text();
    const data = JSON.parse(raw) as unknown;
    const entry: CacheEntry = { data, raw, updatedAt: Date.now() };
    swrCache.set(url, entry);
    return entry;
  })().finally(() => {
    inFlight.delete(url);
  });

  inFlight.set(url, promise);
  return promise;
}

export function usePolling<T>(
  url: string,
  intervalMs = 5000,
  options?: { enabled?: boolean; staleTimeMs?: number }
) {
  const enabled = options?.enabled ?? true;
  const staleTimeMs = options?.staleTimeMs ?? Math.min(intervalMs, 4000);

  const cached = swrCache.get(url);
  const [data, setData] = useState<T | null>(() => (cached ? (cached.data as T) : null));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(() => enabled && !cached);

  const lastRawRef = useRef<string | null>(cached?.raw ?? null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Sinkronkan state langsung dari cache saat URL berubah tanpa flicker skeleton
  useEffect(() => {
    const entry = swrCache.get(url);
    if (entry) {
      setData(entry.data as T);
      lastRawRef.current = entry.raw;
      setLoading(false);
    } else if (enabled) {
      setData(null);
      lastRawRef.current = null;
      setLoading(true);
    }
  }, [url, enabled]);

  const fetchNow = useCallback(
    async (force = true) => {
      if (!enabled) return;
      if (!force) {
        const entry = swrCache.get(url);
        if (entry && Date.now() - entry.updatedAt < staleTimeMs) {
          if (mountedRef.current) {
            if (lastRawRef.current !== entry.raw) {
              lastRawRef.current = entry.raw;
              setData(entry.data as T);
            }
            setLoading(false);
          }
          return;
        }
      }

      try {
        const entry = await fetchWithDedup(url);
        if (!mountedRef.current) return;
        if (lastRawRef.current !== entry.raw) {
          lastRawRef.current = entry.raw;
          setData(entry.data as T);
        }
        setError(null);
      } catch (e) {
        if (!mountedRef.current) return;
        setError(e instanceof Error ? e.message : "Gagal memuat data");
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [url, enabled, staleTimeMs]
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Pada mount / ganti menu: pakai cache jika masih segar, revalidate di background jika basi
    void fetchNow(false);

    const startTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        void fetchNow(true);
      }, intervalMs);
    };

    const handleVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        void fetchNow(false);
      }
    };

    startTimer();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, [fetchNow, intervalMs, enabled]);

  const refresh = useCallback(() => fetchNow(true), [fetchNow]);

  return { data, error, loading, refresh };
}
