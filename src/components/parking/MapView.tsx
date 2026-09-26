"use client";
/** MapView - full-screen immersive parking map overlay + live gate pill & ticker (v23). */
import React from "react";
import { motion } from "framer-motion";
import { Building2, ChevronRight, MoveHorizontal, Radio, X } from "lucide-react";
import { MapLegend, ParkingMap, useMapCounts } from "./ParkingMap";
import { useParkir } from "@/lib/store";
import {
  campusById,
  campusLabel,
  maskPlate,
  slotStatusForWindow,
  tr,
  type Slot,
} from "@/lib/parking-data";
import { cn } from "@/lib/utils";

function timeAgoShort(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

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
  const campus = campusById(useParkir((s) => s.campusId));
  const liveOn = useParkir((s) => s.liveOn);
  const liveStatus = useParkir((s) => s.liveStatus);
  const liveEvents = useParkir((s) => s.liveEvents);
  const liveLatency = useParkir((s) => s.liveLatency);
  const liveToggle = useParkir((s) => s.liveToggle);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const { free, total } = useMapCounts();
  const [showHint, setShowHint] = React.useState(true);
  const [, tickNow] = React.useReducer((x: number) => x + 1, 0);

  // time-ago ticker refresh
  React.useEffect(() => {
    if (!open || !liveOn) return;
    const id = setInterval(tickNow, 5000);
    return () => clearInterval(id);
  }, [open, liveOn]);

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
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card/60 transition hover:border-primary/40"
          >
            <X className="h-4.5 w-4.5" />
          </button>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold leading-tight tracking-tight">
              {t("parkingMap")}
            </h2>
            <p className="flex items-center gap-1.5 truncate text-[10px] text-muted-foreground">
              {campus.available
                ? campus.building
                  ? `${campus.location} · ${campusLabel(campus)}`
                  : campus.location
                : campusLabel(campus)}
              {!campus.available && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-primary">
                  {t("campusSoon")}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {campus.available && (
            <span className="tnum hidden rounded-full border border-green-400/25 bg-green-400/10 px-3 py-1.5 text-xs font-bold text-green-300 sm:inline">
              {free}/{total} {t("slotWord")}
            </span>
          )}
          {/* live pill - click to connect/disconnect the gate stream */}
          <button
            onClick={liveToggle}
            aria-label={liveOn ? t("liveDisconnect") : t("liveToggle")}
            data-live-pill={liveOn ? "on" : "off"}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full border px-3 text-[10px] font-black uppercase tracking-wider transition",
              liveOn && liveStatus === "live"
                ? "border-red-400/40 bg-red-400/10 text-red-400"
                : liveOn
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                  : "border-border bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            <Radio className="h-3.5 w-3.5" />
            {liveOn ? (liveStatus === "live" ? t("liveOffline").replace("OFF", "LIVE") : t("liveConnecting")) : t("liveOffline")}
            {liveOn && liveStatus === "live" && (
              <span className="tnum rounded-full bg-red-400/15 px-1.5 py-0.5 text-[9px] font-bold text-red-300">
                {liveLatency}ms
              </span>
            )}
          </button>
        </div>
      </div>

      {/* live ticker - privacy-masked plates, newest first */}
      {liveOn && liveEvents.length > 0 && (
        <div data-live-ticker className="mx-4 mb-2 overflow-hidden rounded-2xl border border-amber-400/25 bg-amber-400/[0.05]">
          <div className="flex gap-2 overflow-x-auto px-3 py-2 slim-scroll">
            {liveEvents.slice(0, 8).map((e) => (
              <span
                key={e.id}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                  e.kind === "in"
                    ? "border-green-400/30 bg-green-400/[0.08] text-green-600 dark:text-green-300"
                    : "border-blue-400/30 bg-blue-400/[0.08] text-blue-600 dark:text-blue-300"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", e.kind === "in" ? "bg-green-400" : "bg-blue-400")} />
                <span className="tnum">{maskPlate(e.plate)}</span>
                <span className="text-muted-foreground">
                  {e.kind === "in" ? t("liveTickerIn") : t("liveTickerOut")} {e.slotNumber}
                </span>
                <span className="text-muted-foreground/60">{timeAgoShort(Date.now() - e.at)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* map */}
      <div className="slim-scroll flex-1 overflow-y-auto px-4 pb-4">
        {!campus.available ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-primary/25 bg-primary/[0.03] px-6 py-16 text-center">
            <Building2 className="h-8 w-8 text-primary" />
            <p className="text-sm font-bold">{campus.name}</p>
            <p className="max-w-[260px] text-[11px] leading-relaxed text-muted-foreground">
              {t("campusSoonNote")}
            </p>
          </div>
        ) : (
        <ParkingMap
          onSlotPress={(s: Slot) => {
            const st = slotStatusForWindow(s, reservations, win);
            if (st === "AVAILABLE") {
              onSlotPress(s.id, s.slotNumber);
              onClose();
            }
          }}
        />
        )}
        {campus.available && (
          <div className="mt-3 flex items-center justify-between">
            <MapLegend />
            <span className="hidden items-center gap-1 text-[10px] text-muted-foreground sm:flex">
              {t("tapSlotHint")}
            </span>
          </div>
        )}
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
