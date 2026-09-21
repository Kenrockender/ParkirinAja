/**
 * Parkir Binus — Service Worker for push notifications (Task 5).
 *
 * Receives { type: "NOTIFY", title, body, tag } from the main thread via
 * postMessage and shows a native OS notification. The `tag` field deduplicates
 * repeat alerts for the same session.
 *
 * No server push endpoint needed — this uses the SW postMessage channel so it
 * works even without a Push API subscription, but still fires OS notifications
 * when the tab is backgrounded or minimised.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
