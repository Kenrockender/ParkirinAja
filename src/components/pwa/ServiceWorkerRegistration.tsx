"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      let refreshedForNewWorker = false;

      // Once an updated worker takes control, reload exactly once so every tab
      // uses the same current component bundle (including History/Ticket views).
      const reloadForNewWorker = () => {
        if (refreshedForNewWorker) return;
        refreshedForNewWorker = true;
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener("controllerchange", reloadForNewWorker);

      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration.scope);
          void registration.update();

          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // New content available, prompt user to refresh
                  console.log("[PWA] New content available, please refresh.");
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("[PWA] Service Worker registration failed:", error);
        });

      return () => navigator.serviceWorker.removeEventListener("controllerchange", reloadForNewWorker);
    }
  }, []);

  return null;
}
