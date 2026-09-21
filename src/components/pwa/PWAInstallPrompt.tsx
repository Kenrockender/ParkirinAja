"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share } from "lucide-react";
import { LogoMark } from "@/components/parking/Brand";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay (don't immediately pester user)
      setTimeout(() => {
        const dismissed = localStorage.getItem("pwa-install-dismissed");
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if app was installed
    window.addEventListener("appinstalled", () => {
      setDeferredPrompt(null);
      setShowPrompt(false);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
    } catch (error) {
      console.error("Install prompt error:", error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  // Don't show if already installed or if user dismissed before
  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-sm"
        >
          <div className="glass rounded-2xl border border-border/50 p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <LogoMark size={48} />
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-sm font-bold">Install Parkir Binus</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {isIOS 
                        ? "Install untuk akses cepat dari home screen"
                        : "Install untuk pengalaman seperti aplikasi native"
                      }
                    </p>
                  </div>
                  <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex gap-2">
                  {isIOS ? (
                    <div className="flex-1 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                      <div className="flex items-center gap-1.5">
                        <Share className="h-3.5 w-3.5" />
                        <span>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong></span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleInstall}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Install Sekarang
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
