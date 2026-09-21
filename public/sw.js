/**
 * Parkir Binus — Service Worker for PWA (offline support + push notifications).
 *
 * Features:
 * - Offline caching with cache-first strategy for static assets
 * - Network-first for API calls with offline fallback
 * - Push notifications via postMessage channel
 *
 * The `tag` field deduplicates repeat alerts for the same session.
 */

const CACHE_NAME = "parkir-binus-v1";
const STATIC_CACHE = "parkir-binus-static-v1";
const DYNAMIC_CACHE = "parkir-binus-dynamic-v1";

// Assets to cache on install
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/logo.svg",
  "/offline",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[SW] Caching static assets");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log("[SW] Removing old cache:", key);
            return caches.delete(key);
          })
      );
    })
  );
  event.waitUntil(self.clients.claim());
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith("http")) return;

  // API calls - network first, fallback to cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Static assets - cache first, fallback to network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Update cache in background
        fetch(request).then((response) => {
          if (response.ok) {
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, response);
            });
          }
        });
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (request.mode === "navigate") {
            return caches.match("/offline");
          }
          return new Response("Offline", { status: 503 });
        });
    })
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "NOTIFY") return;

  const { title, body, tag, icon } = data;

  event.waitUntil(
    self.registration.showNotification(title ?? "Parkir Binus", {
      body: body ?? "",
      tag: tag ?? "parkir-binus",
      icon: icon ?? "/favicon.ico",
      badge: "/favicon.ico",
      renotify: false,
    })
  );
});

// When user clicks the notification, focus the app tab or open it
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        if (list.length > 0) {
          return list[0].focus();
        }
        return self.clients.openWindow("/");
      })
  );
});
