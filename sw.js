// FindMe - service worker. Hanya menyimpan aplikasi agar bisa dibuka offline.
// Tidak menyimpan data pengguna (data ada di dalam tautan, bukan di perangkat/server).
const CACHE = "findme-v1";
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];
const CDN_QR = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    try {
      const res = await fetch(CDN_QR, { mode: "cors" });
      if (res.ok) await cache.put(CDN_QR, res);
    } catch (e) { /* offline saat install: library QR diambil nanti */ }
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isCdn = req.url === CDN_QR;
  if (!sameOrigin && !isCdn) return; // jangan campur request pihak lain

  // Network-first: versi terbaru dipakai jika ada internet, cache jika offline
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok && (sameOrigin || isCdn)) cache.put(req, res.clone());
      return res;
    } catch (e) {
      const cached = await cache.match(req, { ignoreSearch: true })
        || await cache.match("./index.html");
      if (cached) return cached;
      return new Response("Offline", { status: 503 });
    }
  })());
});
