// Service Worker minimal Smart Pemira — HANYA fallback offline untuk navigasi.
// Prinsip: jangan pernah meng-cache data pemilu/suara. Semua request jaringan
// tetap langsung ke server; SW hanya menampilkan halaman offline yang ramah
// bila jaringan putus di tengah pemungutan (mis. sinyal kampus drop).
const CACHE = "pemira-offline-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icon-192.png"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Hanya navigasi halaman (document) — abaikan API/SSE/aset statis
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then((cached) => cached ?? new Response("Offline", { status: 503 }))
    )
  );
});
