"use client";
/** MapView — full-screen immersive parking map overlay. */
import React from "react";
import { motion } from "framer-motion";
import { ChevronRight, MoveHorizontal, X } from "lucide-react";
import { MapLegend, ParkingMap, useMapCounts } from "./ParkingMap";
import { useParkir } from "@/lib/store";
import { LOCATION, slotStatusForWindow, tr, type Slot } from "@/lib/parking-data";

export function MapView({
  open,
  onClose,
  onSlotPress,
}: {
  open: boolean;
  onClose: () => void;
  onSlotPress: (slotId: string, slotNumber: string) => void;
}) {
  const lang = useParkir((s) => s.lang);
  const slots = useParkir((s) => s.slots);
  const reservations = useParkir((s) => s.reservations);
  const win = useParkir((s) => s.viewWindow);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const { free, total } = useMapCounts();
  const [showHint, setShowHint] = React.useState(true);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-40 flex flex-col bg-background/95 backdrop-blur-xl"
    >
      {/* header */}
      <div className="flex items-center justify-between px-4 pb-3 pt-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/60 transition hover:border-primary/40"
          >
            <X className="h-4.5 w-4.5" />
          </button>
          <div>
            <h2 className="font-display text-base font-bold leading-tight tracking-tight">
              {t("parkingMap")}
            </h2>
            <p className="text-[10px] text-muted-foreground">{LOCATION.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="tnum rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
            {free}/{total} {t("slotWord")}
          </span>
        </div>
      </div>

      {/* map */}
      <div className="slim-scroll flex-1 overflow-y-auto px-4 pb-4">
        <ParkingMap
          onSlotPress={(s: Slot) => {
            const st = slotStatusForWindow(s, reservations, win);
            if (st === "AVAILABLE") {
              onSlotPress(s.id, s.slotNumber);
              onClose();
            }
          }}
        />
        <div className="mt-3 flex items-center justify-between">
          <MapLegend />
          <span className="hidden items-center gap-1 text-[10px] text-muted-foreground sm:flex">
            {t("tapSlotHint")}
          </span>
        </div>
      </div>

      {/* scroll hint pill */}
      {showHint && (
        <motion.button
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={() => setShowHint(false)}
          className="glow-primary absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
        >
          <MoveHorizontal className="h-4 w-4 animate-bounce-soft" />
          {t("scrollHint")}
          <ChevronRight className="h-3.5 w-3.5 opacity-60" />
        </motion.button>
      )}
    </motion.div>
  );
}
