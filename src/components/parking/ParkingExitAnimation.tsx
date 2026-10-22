"use client";

import React from "react";
import { motion } from "framer-motion";
import { SkipForward } from "lucide-react";
import type { Lang, Reservation } from "@/lib/parking-data";

type ParkingExitAnimationProps = {
  reservation: Reservation;
  lang: Lang;
  onClose: () => void;
};

/** Plays the rendered HyperFrames departure sequence after the user checks out. */
export function ParkingExitAnimation({ reservation, lang, onClose }: ParkingExitAnimationProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const id = lang === "id";

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => undefined);
  }, [reservation.id]);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={id ? "Animasi keluar parkir" : "Parking exit animation"}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 p-4"
    >
      <motion.section
        key={reservation.id}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="relative aspect-[9/16] w-full max-w-[430px] overflow-hidden rounded-[2rem]"
      >
        <video
          ref={videoRef}
          src="/animations/parkirinaja-parking-exit.webm"
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={onClose}
          className="h-full w-full object-contain"
          aria-label={id ? `Animasi keluar untuk slot ${reservation.slotNumber}` : `Exit animation for slot ${reservation.slotNumber}`}
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-slate-950/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {id ? "Lewati" : "Skip"} <SkipForward className="h-3.5 w-3.5" />
        </button>
      </motion.section>
    </div>
  );
}
