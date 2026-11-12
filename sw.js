const CACHE_NAME = "pishro-dashboard-shell-v2";

/* آیکون‌ها مستقیماً از ریشه مخزن GitHub */
const ICON_BASE = "https://raw.githubusercontent.com/buammar/dashboard/main/";

/* فایل‌های محلی پوسته */
const SHELL = [
  "./",
  "./index.html",
  "./config.js",
  "./manifest.webmanifest"
];

/* آیکون‌های مخزن (جداگانه کش می‌شوند) */
const ICONS = [
  ICON_BASE + "icon-192.png",
  ICON_BASE + "icon-512.png",
  ICON_BASE + "icon-512-maskable.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // پوسته محلی
      await cache.addAll(SHELL).catch(() => {});
      // آیکون‌های مخزن؛ اگر یکی نبود، نصب شکست نخورد
      await Promise.all(
        ICONS.map(url =>
          fetch(url, { mode: "cors" })
            .then(res => (res.ok ? cache.put(url, res) : null))
            .catch(() => null)
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const u = new URL(event.request.url);

  // آیکون‌های مخزن GitHub: cache-first
  if (u.hostname === "raw.githubusercontent.com") {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request, { mode: "cors" }).then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // فایل‌های پوسته محلی: cache-first با به‌روزرسانی پس‌زمینه
  // محتوای Google Apps Script (script.google.com) دست نمی‌خورد و همیشه آنلاین است.
  if (u.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const network = fetch(event.request).then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
