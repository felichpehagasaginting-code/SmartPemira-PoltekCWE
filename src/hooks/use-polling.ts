"use client";

// Hook polling sederhana untuk data real-time (Meja PPUR, Monitor Panwaslu, KPUM)
import { useCallback, useEffect, useRef, useState } from "react";

export function usePolling<T>(url: string, intervalMs = 5000, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNow = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as T);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    fetchNow();
    timerRef.current = setInterval(fetchNow, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchNow, intervalMs, enabled]);

  return { data, error, loading, refresh: fetchNow };
}
