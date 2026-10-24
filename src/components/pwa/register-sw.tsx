"use client";

// Registrasi service worker (fallback offline) — client-only, sekali per sesi.
// SW sengaja minimal: TIDAK menyimpan data pemilu apa pun, hanya halaman /offline.
import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* SW gagal (mis. insecure context) — app tetap berfungsi normal */
      });
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
