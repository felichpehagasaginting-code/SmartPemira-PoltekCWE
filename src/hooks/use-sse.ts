"use client";

// ============================================================
// HOOK SSE — Realtime event stream (Rekomendasi #8)
// Pengganti polling untuk data monitor: server hanya mengirim
// saat ada perubahan + push event keamanan seketika. Koneksi
// putus → EventSource reconnect otomatis → status tampil di UI.
// ============================================================
import { useEffect, useRef, useState } from "react";

export interface SSEState<T> {
  data: T | null;
  lastAuth: { type: string; detail: string; at: string } | null;
  connected: boolean;
  error: string | null;
}

export function useSSE<T>(url: string, options?: { enabled?: boolean }): SSEState<T> {
  const enabled = options?.enabled ?? true;
  const [state, setState] = useState<SSEState<T>>({ data: null, lastAuth: null, connected: false, error: null });
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retries = 0;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const es = new EventSource(url);
      sourceRef.current = es;

      es.addEventListener("open", () => {
        retries = 0;
        setState((s) => ({ ...s, connected: true, error: null }));
      });

      es.addEventListener("snapshot", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as T;
          setState((s) => ({ ...s, data, connected: true, error: null }));
        } catch {
          // abaikan payload rusak
        }
      });

      es.addEventListener("auth", (e) => {
        try {
          const payload = JSON.parse((e as MessageEvent).data) as { type: string; detail: string; at: string };
          setState((s) => ({ ...s, lastAuth: payload }));
        } catch {
          // abaikan
        }
      });

      es.addEventListener("error", () => {
        setState((s) => ({ ...s, connected: false, error: "Koneksi realtime terputus — mencoba ulang otomatis…" }));
        es.close();
        sourceRef.current = null;
        // Reconnect dengan backoff ringan (EventSource asli sudah auto-reconnect;
        // ini hanya lapisan kedua bila koneksi mati total)
        retries += 1;
        if (retries <= 6 && !disposed) {
          retryTimer = setTimeout(connect, Math.min(2000 * retries, 15000));
        }
      });
    };

    connect();
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [url, enabled]);

  return state;
}
