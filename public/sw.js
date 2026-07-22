const CACHE_VERSION = "linh-quyen-v4";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const API_CACHE = `${CACHE_VERSION}-api`;
const STATIC_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isChapterPayload(url) {
  return url.pathname.startsWith("/api/stories/") && /\/chapters\/\d+$/.test(url.pathname);
}

/** Default polished chapter JSON only — bilingual/query variants stay network-first. */
function isDefaultChapterPayload(url) {
  if (!isChapterPayload(url)) return false;
  if (!url.search || url.search === "?") return true;
  const params = url.searchParams;
  const primary = params.get("primary");
  const secondary = params.get("secondary");
  const mode = params.get("mode");
  const primaryDefault = !primary || primary === "polished";
  const secondaryDefault = !secondary;
  const modeDefault = !mode || mode === "single";
  return primaryDefault && secondaryDefault && modeDefault && [...params.keys()].every((key) =>
    key === "primary" || key === "secondary" || key === "mode"
  );
}

function isStaticAsset(request, url) {
  return request.destination === "script"
    || request.destination === "style"
    || request.destination === "font"
    || request.destination === "image"
    || url.pathname.startsWith("/icons/");
}

function isBackgroundAudio(url) {
  return url.pathname.startsWith("/background-audio/");
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) return caches.match(fallbackUrl);
    throw new Error("offline");
  }
}

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { return; }

  event.waitUntil(
    self.registration.showNotification(data.title || "Linh Quyển Các", {
      body: data.body || "Có chương mới từ truyện đang theo dõi.",
      icon: data.icon || "/icons/icon-192.png",
      badge: data.badge || "/icons/icon-192.png",
      tag: `story-${data.storyId}-${data.chapterNumber}`,
      renotify: false,
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const found = clients.find((c) => c.url.startsWith(self.location.origin) && "focus" in c);
      if (found) return found.focus().then(() => found.navigate(url));
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGE_CACHE, "/offline.html"));
    return;
  }

  if (isDefaultChapterPayload(url)) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  if (isChapterPayload(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (isBackgroundAudio(url)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  if (isStaticAsset(request, url)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});
