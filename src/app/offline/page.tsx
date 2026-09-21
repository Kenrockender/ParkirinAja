"use client";

import { motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { LogoMark } from "@/components/parking/Brand";

export default function OfflinePage() {
  return (
    <div className="ambient flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <LogoMark size={64} />
      </motion.div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2">
          <WifiOff className="h-5 w-5 text-muted-foreground" />
          <h1 className="font-display text-2xl font-bold">Anda Offline</h1>
        </div>
        <p className="max-w-xs text-sm text-muted-foreground">
          Tidak ada koneksi internet. Periksa koneksi Anda dan coba lagi.
        </p>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
      >
        Coba Lagi
      </button>
    </div>
  );
}
