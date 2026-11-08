// ============================================================
// SERVICE WORKER PWA — Smart Pemira Poltek CWE (Paket #3)
// Menyediakan offline caching untuk shell UI bilik suara (/pemilih),
// font, stylesheets, dan ikon sehingga bilik tetap dapat diakses
// dan draf pemilih aman saat sinyal kampus berfluktuasi.
// CATATAN KEAMANAN: Endpoint /api/* bersifat Network-Only (tidak dicache).
// ============================================================

const CACHE_NAME = "pemira-bilik-v1";

const STATIC_SHELL = [
  "/pemilih",
  "/verifikasi",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_SHELL).catch((err) => {
          // Abaikan resource parsial yang gagal saat development
          console.warn("[SW] Cache preload warning:", err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. Lewatkan seluruh panggilan API, mutasi, dev HMR, dan cross-origin
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("webpack-hmr") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  // 2. Next.js static chunks / fonts / images (Cache-First dengan Network Fallback)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".jpg")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkRes;
        });
      })
    );
    return;
  }

  // 3. Navigasi Halaman Bilik Suara (Network-First dengan Cache Fallback)
  if (event.request.mode === "navigate" || url.pathname === "/pemilih") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const fallback = await caches.match("/pemilih");
          if (fallback) return fallback;
          return new Response(
            `<!DOCTYPE html>
            <html lang="id">
            <head><meta charset="utf-8"><title>Mode Offline — Bilik Suara Smart Pemira</title></head>
            <body style="font-family:sans-serif;background:#F6F4EE;color:#141E19;padding:2rem;text-align:center;">
              <h1 style="color:#1B7F4E">Bilik Suara Offline</h1>
              <p>Koneksi internet Anda terputus. Pilihan yang telah Anda pilih tersimpan aman di peramban.</p>
              <button onclick="window.location.reload()" style="padding:10px 20px;background:#1B7F4E;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">Coba Lagi</button>
            </body>
            </html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        })
    );
  }
});
