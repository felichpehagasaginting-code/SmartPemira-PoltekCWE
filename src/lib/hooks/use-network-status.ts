"use client";

// ============================================================
// HOOK MONITORING STATUS JARINGAN (Paket #3)
// Mendeteksi koneksi online/offline secara reaktif serta
// memverifikasi konektivitas nyata ke API simpul Smart Pemira.
// ============================================================
import { useCallback, useEffect, useState } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  reconnectCount: number;
  lastChangedAt: Date | null;
  checkConnectivity: () => Promise<boolean>;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });

  const [wasOffline, setWasOffline] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastChangedAt, setLastChangedAt] = useState<Date | null>(null);

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return true;
    try {
      // Cek ringan ke endpoint health dengan timeout 3 detik
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 3000);
      const res = await fetch("/api/health", {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      const online = res.ok || res.status === 200 || res.status === 304;
      setIsOnline(online);
      return online;
    } catch {
      setIsOnline(false);
      setWasOffline(true);
      return false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Registrasi Service Worker PWA bila didukung peramban
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("[SW] Registration error:", err));
    }

    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      setReconnectCount((c) => c + 1);
      setLastChangedAt(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setLastChangedAt(new Date());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    isOnline,
    wasOffline,
    reconnectCount,
    lastChangedAt,
    checkConnectivity,
  };
}
