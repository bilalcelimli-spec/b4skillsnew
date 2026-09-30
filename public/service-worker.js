/**
 * b4skills Service Worker — PWA Offline Support
 * HTML and APIs are network-only. Only same-origin hashed build assets are cached.
 * Background sync for pending assessment responses.
 */

const CACHE_VERSION = "b4skills-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// ---------------------------------------------------------------------------
// Activate promptly, but never reload an open exam.
// ---------------------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

// ---------------------------------------------------------------------------
// Activate: clean old caches
// ---------------------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    migrateCaches().then(() => self.clients.claim())
  );
});

async function migrateCaches() {
  for (const name of await caches.keys()) {
    // CacheStorage only: never touch IndexedDB or pending answer queues.
    if (name === "api-reads" || name === "media-assets" || /^b4skills-.*-api$/.test(name)) {
      await caches.delete(name);
    } else if (/^b4skills-.*-static$/.test(name)) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        // Keep old hashed chunks for tabs that were open during deployment.
        if (!isStaticAsset(new URL(request.url))) await cache.delete(request);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Fetch: routing logic
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle http/https — chrome-extension://, data:, blob: etc. cannot be cached
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  if (url.origin !== self.location.origin || request.method !== "GET") return;

  // An old worker may have cached authenticated responses or the app shell.
  // Bypass both CacheStorage and the browser's HTTP cache for these requests.
  if (url.pathname.startsWith("/api/") || request.mode === "navigate" ||
      url.pathname === "/" || url.pathname.endsWith(".html")) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // Static assets: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

});

function isStaticAsset(url) {
  return url.origin === self.location.origin &&
    /^\/assets\/[^/]+-[\w-]+\.(js|css|woff2?|ttf|png|svg|webp)$/.test(url.pathname);
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Storage quota/privacy-mode failures must not hide a successful fetch.
      try {
        const cache = await caches.open(cacheName);
        await cache.put(request, response.clone());
      } catch { /* network response is still usable */ }
    }
    return response;
  } catch {
    return new Response("Offline — cached version unavailable", { status: 503 });
  }
}

// ---------------------------------------------------------------------------
// Background Sync: flush pending responses when back online
// ---------------------------------------------------------------------------
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-responses") {
    event.waitUntil(syncPendingResponses());
  }
});

async function syncPendingResponses() {
  const db = await openDB();
  const tx = db.transaction("syncQueue", "readwrite");
  const store = tx.objectStore("syncQueue");
  const entries = await promisify(store.getAll());

  for (const entry of entries) {
    try {
      const res = await fetch(entry.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${entry.token}` },
        body: entry.body,
      });
      if (res.ok) {
        const delTx = db.transaction("syncQueue", "readwrite");
        delTx.objectStore("syncQueue").delete(entry.id);
      }
    } catch {
      // Will retry on next sync event
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("b4skills_offline", 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue", { keyPath: "id" });
      }
    };
  });
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Push notifications (if granted)
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? "b4skills", {
      body: data.body ?? "",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      data: { url: data.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(clients.openWindow(url));
});
