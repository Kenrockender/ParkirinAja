"use client";
/**
 * ParkingMap - site plan of the active campus, theme-aware.
 * Two layouts:
 *  · "building" (Anggrek/Kemanggisan) - walled deck with exact physical layout:
 *    Row A: A-01…A-18, pillar every 3 slots, WallStrip, Entrance
 *    Row B: B-01, RampL2↓ (spans A-02+A-03 width), B-02…B-04, WallStrip,
 *            B-05…B-07, WallStrip, B-08, WallStrip, LIFT, WC, WallStrip,
 *            B-09…B-11, WallStrip, B-12…B-14, WallStrip, RampUp, RampDown
 *    Row A walls (pillars) and Row B WallStrips are pixel-aligned vertically.
 *  · "openlot"  (Alam Sutera / Bekasi) - open lot: A(20/25) · drive lane · B(20/25).
 *
 * v23: when the live gate stream is connected, guest cars appear as amber
 * ringing tiles (overlay only - never in reservations/transactions).
 */
import React from "react";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CarFront,
  Clock3,
  DoorOpen,
  LogIn,
  Accessibility,
  Zap,
  Wrench,
} from "lucide-react";
import {
  campusById,
  slotStatusForWindow,
  tr,
  type LiveGuest,
  type Slot,
  type SlotStatus,
  type TimeWindow,
  type Reservation,
} from "@/lib/parking-data";
import { useParkir } from "@/lib/store";

// ── layout constants (full / compact) ──────────────────────────────────────
const SLOT_W   = { full: 52, compact: 44 } as const;
const SLOT_H   = { full: 64, compact: 48 } as const;
const GAP      = 6; // px - gap between every flex child
const PILLAR_W = 6; // px - same as WallStrip width for alignment

/**
 * Compute the pixel width that B's left ramp must occupy so that B-02 aligns
 * exactly with A-04.
 *
 * Row A left of pillar-1 (after A-03):
 *   3 slots + 2 inner gaps = 3*slotW + 2*GAP
 * B-01 takes 1 slot + 1 gap on its right:
 *   slotW + GAP
 * Remaining = ramp body width:
 *   (3*slotW + 2*GAP) - (slotW + GAP) = 2*slotW + GAP
 */
function rampL2DownW(compact: boolean): number {
  const sw = compact ? SLOT_W.compact : SLOT_W.full;
  return 2 * sw + GAP; // = 110 (full) / 94 (compact)
}

const STYLE: Record<
  SlotStatus,
  { box: string; num: string; dot: string }
> = {
  AVAILABLE: {
    box: "border-green-300 bg-green-50 hover:bg-green-100 hover:border-green-400 hover:shadow-[0_0_20px_-4px_rgba(34,197,94,0.45)] dark:border-green-400/35 dark:bg-green-400/[0.07] dark:hover:bg-green-400/[0.14] dark:hover:border-green-400/60 dark:hover:shadow-[0_0_20px_-4px_rgba(34,197,94,0.5)] cursor-pointer",
    num: "text-green-700 dark:text-green-300",
    dot: "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.65)] dark:bg-green-400 dark:shadow-[0_0_6px_rgba(34,197,94,0.9)]",
  },
  RESERVED: {
    box: "border-amber-200 bg-amber-50 dark:border-amber-400/25 dark:bg-amber-400/[0.05]",
    num: "text-amber-600 dark:text-amber-300/70",
    dot: "bg-amber-400 dark:bg-amber-400/60",
  },
  OCCUPIED: {
    box: "border-red-200 bg-red-50 dark:border-red-400/20 dark:bg-red-400/[0.04]",
    num: "text-red-500 dark:text-red-300/60",
    dot: "bg-red-400/70 dark:bg-red-400/50",
  },
  MAINTENANCE: {
    box: "border-slate-200 bg-slate-100 dark:border-slate-500/20 dark:bg-slate-500/[0.05]",
    num: "text-slate-400 dark:text-slate-500",
    dot: "bg-slate-400 dark:bg-slate-600",
  },
};

/** Open-lot bay fills - bays sit adjacent, separated by thin paint lines (divide-x). */
const OPENLOT_FILL: Record<SlotStatus, string> = {
  AVAILABLE:
    "bg-green-50 hover:bg-green-100 dark:bg-green-400/[0.07] dark:hover:bg-green-400/[0.14] cursor-pointer",
  RESERVED: "bg-amber-50 dark:bg-amber-400/[0.05]",
  OCCUPIED: "bg-red-50 dark:bg-red-400/[0.04]",
  MAINTENANCE: "bg-slate-100 dark:bg-slate-500/[0.08]",
};

// ───────────────────── live guest overlay (v23) ─────────────────────

/** slotId → guest map, only when live is on AND the view window covers "now". */
export function useGuestMap(): Map<string, LiveGuest> {
  const liveOn = useParkir((s) => s.liveOn);
  const guests = useParkir((s) => s.liveGuests);
  const win = useParkir((s) => s.viewWindow);
  return React.useMemo(() => {
    if (!liveOn) return new Map();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const hhmm = Number(`${now.getHours()}${String(now.getMinutes()).padStart(2, "0")}`);
    const coversNow =
      win.date === today &&
      Number(win.startTime.replace(":", "")) <= hhmm + 1 &&
      hhmm <= Number(win.endTime.replace(":", "")) + 1;
    if (!coversNow) return new Map(); // future windows never show guests
    return new Map(guests.map((g) => [g.slotId, g]));
  }, [liveOn, guests, win.date, win.startTime, win.endTime]);
}

function SlotBay({
  slot,
  status,
  onSlotPress,
  compact,
  openlot,
  live,
  dimmed,
}: {
  slot: Slot;
  status: SlotStatus;
  onSlotPress?: (s: Slot) => void;
  compact?: boolean;
  openlot?: boolean;
  live?: LiveGuest;
  /** Dim this slot when a type filter is active and it doesn't match. */
  dimmed?: boolean;
}) {
  const st = STYLE[status];
  const disabled = status !== "AVAILABLE";
  return (
    <button
      type="button"
      disabled={disabled || !onSlotPress}
      onClick={() => onSlotPress?.(slot)}
      aria-label={`Slot ${slot.slotNumber} - ${status}`}
      title={live ? `${slot.slotNumber} · ${live.vehicle} (tamu live)` : `${slot.slotNumber} · ${status}`}
      data-live-guest={live ? slot.slotNumber : undefined}
      className={cn(
        "group relative flex shrink-0 flex-col items-center justify-center gap-1 transition-all duration-200",
        compact ? "h-12 w-11" : "h-16 w-[52px]",
        openlot
          ? cn("rounded-none", OPENLOT_FILL[status])
          : cn("rounded-xl border", st.box),
        live && "ring-2 ring-amber-400 ring-offset-1 ring-offset-white dark:ring-offset-[#0F172A]",
        disabled && "cursor-default",
        !disabled && "active:scale-95",
        dimmed && "opacity-25"
      )}
    >
      {live && (
        <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
          <span className="absolute h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
          <span className="relative h-2 w-2 rounded-full bg-amber-400" />
        </span>
      )}
      {status === "AVAILABLE" && !live && (
        <span className={cn("absolute right-1.5 top-1.5 h-1 w-1 rounded-full", st.dot)} />
      )}
      {status === "OCCUPIED" && <CarFront className={cn("h-3 w-3 text-red-400 opacity-80 dark:opacity-60", compact ? "hidden" : "block")} />}
      {status === "RESERVED" && <Clock3 className={cn("h-3 w-3 text-amber-500 opacity-70 dark:text-amber-300 dark:opacity-40", compact && "hidden")} />}
      {status === "MAINTENANCE" && <Wrench className={cn("h-3 w-3 text-slate-400 opacity-80 dark:opacity-40", compact && "hidden")} />}
      {/* slot type badge - only shown when not occupied/reserved/maintenance */}
      {status === "AVAILABLE" && slot.slotType === "EV" && (
        <Zap className="h-2.5 w-2.5 text-green-500 dark:text-green-400" aria-label="EV Charger" />
      )}
      {status === "AVAILABLE" && slot.slotType === "DISABILITY" && (
        <Accessibility className="h-2.5 w-2.5 text-blue-500 dark:text-blue-400" aria-label="Disability" />
      )}
      <span
        className={cn(
          "tnum font-display font-semibold tracking-tight",
          compact ? "text-[9.5px]" : "text-[11px]",
          live ? "text-amber-600 dark:text-amber-300" : st.num
        )}
      >
        {slot.slotNumber}
      </span>
    </button>
  );
}

/** Pillar - thin vertical separator between every 3-slot chunk in Row A. */
function Pillar({ h }: { h: number }) {
  return (
    <div
      aria-hidden
      className="shrink-0 self-stretch rounded-full bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200 dark:from-white/[0.07] dark:via-white/[0.13] dark:to-white/[0.07]"
      style={{ width: PILLAR_W, minHeight: h }}
    />
  );
}

/**
 * WallStrip - tembok vertical (aligned A↔B).
 * Same visual weight as Pillar but slightly wider for physical wall feel.
 */
function WallStrip({ h }: { h: number }) {
  return (
    <div
      aria-hidden
      className="shrink-0 self-stretch rounded-full bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200 dark:from-white/[0.06] dark:via-white/[0.14] dark:to-white/[0.06]"
      style={{ width: PILLAR_W, minHeight: h }}
    />
  );
}

/**
 * RampL2Down - ramp turun dari Lantai 2, muncul di Row B setelah B-01.
 * Lebar = 2*slotW + GAP sehingga B-02 tepat sejajar dengan A-04.
 */
function RampL2Down({ compact, h }: { compact: boolean; h: number }) {
  const lang = useParkir((s) => s.lang);
  const w = rampL2DownW(compact);
  return (
    <div
      data-map-el="ramp-l2-down"
      aria-label="Ramp turun dari Lantai 2"
      className="flex shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-slate-300 bg-gradient-to-b from-blue-100 to-blue-50 dark:border-white/[0.12] dark:from-binus-blue/35 dark:to-binus-blue/20"
      style={{ width: w, height: h }}
    >
      <span aria-hidden className="flex flex-col items-center gap-0.5" style={{ opacity: 0.45 }}>
        {[0, 1, 2].map((i) => (
          <svg key={i} viewBox="0 0 10 6" className="h-[6px] w-[10px] text-blue-500 dark:text-binus-bright" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M1 1l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ))}
      </span>
      <ArrowDown className="h-4 w-4 text-binus-blue dark:text-binus-bright" />
      <span className="text-[7.5px] font-black leading-none tracking-wider text-binus-blue dark:text-binus-bright/90">RAMP</span>
      <span className="rounded-sm bg-binus-blue/90 px-1 text-[6.5px] font-black leading-[10px] text-white dark:bg-binus-bright/90 dark:text-[#0F172A]">
        {lang === "id" ? "L2 ↓" : "L2 ↓"}
      </span>
    </div>
  );
}

/**
 * RampUp / RampDown - dua ramp di ujung kanan Row B (naik ke L2 dan turun dari L2).
 * Masing-masing lebarnya = slotW sehingga bersama-sama sejajar dengan Entrance Row A
 * yang lebarnya 2*slotW + GAP (sama dengan lebar Entrance di Row A = 84/64px compact).
 */
function RampUp({ compact, h }: { compact: boolean; h: number }) {
  const sw = compact ? SLOT_W.compact : SLOT_W.full;
  return (
    <div
      data-map-el="ramp-up"
      aria-label="Ramp naik ke Lantai 2"
      className="flex shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-green-200 bg-gradient-to-b from-green-50 to-green-100 dark:border-green-400/25 dark:from-green-400/[0.12] dark:to-green-400/[0.08]"
      style={{ width: sw, height: h }}
    >
      <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />
      <span className="text-[7.5px] font-black leading-none tracking-wider text-green-700 dark:text-green-300">RAMP</span>
      <span className="rounded-sm bg-green-600/90 px-1 text-[6.5px] font-black leading-[10px] text-white dark:bg-green-400/90 dark:text-[#0F172A]">
        L2 ↑
      </span>
    </div>
  );
}

function RampDown({ compact, h }: { compact: boolean; h: number }) {
  const sw = compact ? SLOT_W.compact : SLOT_W.full;
  return (
    <div
      data-map-el="ramp-down"
      aria-label="Ramp turun dari Lantai 2"
      className="flex shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50 to-blue-50 dark:border-blue-400/25 dark:from-blue-400/[0.12] dark:to-blue-400/[0.08]"
      style={{ width: sw, height: h }}
    >
      <ArrowDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <span className="text-[7.5px] font-black leading-none tracking-wider text-blue-700 dark:text-blue-300">RAMP</span>
      <span className="rounded-sm bg-blue-600/90 px-1 text-[6.5px] font-black leading-[10px] text-white dark:bg-blue-400/90 dark:text-[#0F172A]">
        L2 ↓
      </span>
    </div>
  );
}

function RowSlots({
  slots,
  onSlotPress,
  compact,
  openlot,
  highlightSlotType,
}: {
  slots: Slot[];
  onSlotPress?: (s: Slot) => void;
  compact?: boolean;
  openlot?: boolean;
  highlightSlotType?: "EV" | "DISABILITY";
}) {
  const lang = useParkir((s) => s.lang);
  const reservations = useParkir((s) => s.reservations);
  const win = useParkir((s) => s.viewWindow);
  const guestMap = useGuestMap();
  const slotH = compact ? SLOT_H.compact : SLOT_H.full;

  // Open lot - one continuous strip of bays divided by thin paint lines.
  if (openlot) {
    return (
      <div className="flex items-stretch overflow-hidden rounded-xl border border-slate-300 divide-x divide-slate-300 dark:border-white/[0.12] dark:divide-white/[0.12]">
        {slots.map((s) => (
          <SlotBay
            key={s.id}
            slot={s}
            status={slotStatusForWindow(s, reservations, win)}
            onSlotPress={onSlotPress}
            compact={compact}
            openlot
            live={guestMap.get(s.id)}
            dimmed={!!highlightSlotType && s.slotType !== highlightSlotType}
          />
        ))}
      </div>
    );
  }

  // Building deck - chunks of 3 slots separated by Pillars.
  const chunks: React.ReactNode[] = [];
  let chunk: React.ReactNode[] = [];

  slots.forEach((s, i) => {
    chunk.push(
      <SlotBay
        key={s.id}
        slot={s}
        status={slotStatusForWindow(s, reservations, win)}
        onSlotPress={onSlotPress}
        compact={compact}
        live={guestMap.get(s.id)}
        dimmed={!!highlightSlotType && s.slotType !== highlightSlotType}
      />
    );
    const isLast = i === slots.length - 1;
    const isPillarPos = (i + 1) % 3 === 0;
    if (isPillarPos && !isLast) {
      chunks.push(
        <div key={`grp-${i}`} className="flex shrink-0 items-stretch gap-1.5">
          {chunk}
        </div>
      );
      chunks.push(<Pillar key={`p-${i}`} h={slotH} />);
      chunk = [];
    }
  });
  if (chunk.length) {
    chunks.push(
      <div key="grp-last" className="flex shrink-0 items-stretch gap-1.5">
        {chunk}
      </div>
    );
  }

  return <div className="flex items-stretch gap-1.5">{chunks}</div>;
}

/**
 * RowB - Row B Kemanggisan dengan layout fisik yang tepat:
 *
 * [B-01] [RampL2↓] [B-02 B-03 B-04] [wall] [B-05 B-06 B-07] [wall]
 * [B-08] [wall] [LIFT] [WC] [wall] [B-09 B-10 B-11] [wall]
 * [B-12 B-13 B-14] [wall] [RampUp] [RampDown]
 *
 * Tembok-tembok di atas sejajar piksel dengan pillar Row A:
 * - wall setelah B-04 → sejajar pillar setelah A-06
 * - wall setelah B-07 → sejajar pillar setelah A-09
 * - wall setelah B-08 → sejajar pillar setelah A-12  (B-08 + LIFT + WC = 3 lebar A)
 * - wall setelah LIFT/WC → sejajar pillar setelah A-12
 * - wall setelah B-11 → sejajar pillar setelah A-15
 * - wall setelah B-14 → sejajar WallStrip setelah A-18 (ujung kanan)
 */
function RowB({
  slots,
  onSlotPress,
  compact,
  highlightSlotType,
}: {
  slots: Slot[];
  onSlotPress?: (s: Slot) => void;
  compact?: boolean;
  highlightSlotType?: "EV" | "DISABILITY";
}) {
  const lang = useParkir((s) => s.lang);
  const reservations = useParkir((s) => s.reservations);
  const win = useParkir((s) => s.viewWindow);
  const guestMap = useGuestMap();
  const h = compact ? SLOT_H.compact : SLOT_H.full;

  function bay(s: Slot) {
    return (
      <SlotBay
        key={s.id}
        slot={s}
        status={slotStatusForWindow(s, reservations, win)}
        onSlotPress={onSlotPress}
        compact={compact}
        live={guestMap.get(s.id)}
        dimmed={!!highlightSlotType && s.slotType !== highlightSlotType}
      />
    );
  }

  // Split slots by index (0-based colIndex order)
  const b1   = slots[0];   // B-01
  const b234 = slots.slice(1, 4);  // B-02 B-03 B-04
  const b567 = slots.slice(4, 7);  // B-05 B-06 B-07
  const b8   = slots[7];           // B-08
  const b91011 = slots.slice(8, 11); // B-09 B-10 B-11
  const b121314 = slots.slice(11, 14); // B-12 B-13 B-14

  return (
    <div className="flex items-stretch gap-1.5">
      {/*
       * B-01 + RampL2↓ + spacer pillar dibungkus dalam satu div dengan lebar eksak
       * = 1 chunk Row A (3 slots + 2 inner gaps) + 1 gap + 1 pillar
       * = 3*slotW + 2*GAP + GAP + PILLAR_W
       * = 168 + 6 + 6 = 180px (full) / 138+6+6=150px (compact)
       * Ini menjamin B-02 tepat sejajar secara piksel dengan A-04.
       */}
      <div
        className="flex shrink-0 items-stretch gap-1.5"
        style={{
          width: (compact ? SLOT_W.compact : SLOT_W.full) * 3
               + GAP * 2   /* inner gaps dalam chunk */
               + GAP       /* gap setelah chunk */
               + PILLAR_W  /* pillar Row A */
        }}
      >
        {/* B-01 */}
        {b1 && bay(b1)}

        {/* Ramp L2 turun dari Lantai 2 */}
        <RampL2Down compact={!!compact} h={h} />

        {/* spacer pillar - align dengan Pillar Row A setelah A-03 */}
        <Pillar h={h} />
      </div>

      {/* B-02 B-03 B-04 */}
      <div className="flex shrink-0 items-stretch gap-1.5">
        {b234.map((s) => bay(s))}
      </div>

      {/* Tembok setelah B-04 - sejajar pillar A setelah A-06 */}
      <WallStrip h={h} />

      {/* B-05 B-06 B-07 */}
      <div className="flex shrink-0 items-stretch gap-1.5">
        {b567.map((s) => bay(s))}
      </div>

      {/* Tembok setelah B-07 - sejajar pillar A setelah A-09 */}
      <WallStrip h={h} />

      {/*
       * B-08 + tembok + LIFT + WC + tembok dibungkus satu div lebar eksak
       * = 1 chunk Row A (168) + 1 gap+pillar+gap (18) = 186px (full) / 150px (compact)
       * Ini menjamin B-09 sejajar dengan A-13.
       */}
      <div
        className="flex shrink-0 items-stretch gap-1.5"
        style={{
          width: (compact ? SLOT_W.compact : SLOT_W.full) * 3
               + GAP * 2
               + GAP
               + PILLAR_W
        }}
      >
        {/* B-08 */}
        {b8 && bay(b8)}

        {/* Tembok sebelum LIFT */}
        <WallStrip h={h} />

        {/* LIFT */}
        <div
          className="flex flex-1 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-1 dark:border-binus-bright/30 dark:bg-binus-bright/[0.08]"
          style={{ height: h }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={cn("text-blue-600 dark:text-binus-bright", compact ? "h-3 w-3" : "h-4 w-4")} aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M8 12V8M16 12v4" strokeLinecap="round" />
            <path d="m6 10 2-2 2 2M14 14l2 2 2-2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[7.5px] font-bold text-blue-600 dark:text-binus-bright">{tr(lang, "liftLabel")}</span>
        </div>

        {/* WC */}
        <div
          className="flex flex-1 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-1 dark:border-slate-400/30 dark:bg-slate-400/[0.07]"
          style={{ height: h }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={cn("text-slate-500 dark:text-slate-300", compact ? "h-3 w-3" : "h-4 w-4")} aria-hidden>
            <circle cx="7.5" cy="4.5" r="1.8" />
            <path d="M7.5 8v6M5.5 14h4l-1 7h-2z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16.5" cy="4.5" r="1.8" />
            <path d="M16.5 8v4m0 0c-1.4 0-2.5 1-2.5 2.5V21h5v-6.5c0-1.5-1.1-2.5-2.5-2.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[7.5px] font-bold text-slate-600 dark:text-slate-300">{tr(lang, "wcLabel")}</span>
        </div>

        {/* Tembok setelah WC - satu tembok saja */}
        <WallStrip h={h} />
      </div>

      {/* B-09 B-10 B-11 */}
      <div className="flex shrink-0 items-stretch gap-1.5">
        {b91011.map((s) => bay(s))}
      </div>

      {/* Tembok setelah B-11 - sejajar pillar A setelah A-15 */}
      <WallStrip h={h} />

      {/* B-12 B-13 B-14 */}
      <div className="flex shrink-0 items-stretch gap-1.5">
        {b121314.map((s) => bay(s))}
      </div>

      {/* Tembok setelah B-14 - sejajar WallStrip setelah A-18 */}
      <WallStrip h={h} />

      {/* Ramp Naik + Ramp Turun - sejajar Entrance Row A (lebar total = 2*slotW + GAP) */}
      <RampUp compact={!!compact} h={h} />
      <RampDown compact={!!compact} h={h} />
    </div>
  );
}

export function ParkingMap({
  onSlotPress,
  compact,
  highlightSlotType,
}: {
  onSlotPress?: (s: Slot) => void;
  compact?: boolean;
  /** When set, dims slots that don't match this type. Pass undefined for no filter. */
  highlightSlotType?: "EV" | "DISABILITY";
}) {
  const lang = useParkir((s) => s.lang);
  const slots = useParkir((s) => s.slots);
  const reservations = useParkir((s) => s.reservations);
  const win = useParkir((s) => s.viewWindow);
  const campus = campusById(useParkir((s) => s.campusId));
  const liveOn = useParkir((s) => s.liveOn);
  const guests = useParkir((s) => s.liveGuests);
  const openlot = campus.layout === "openlot";

  const rowA = slots.filter((s) => s.rowLabel === "A");
  const rowB = slots.filter((s) => s.rowLabel === "B");

  const counts = slots.reduce<Record<string, number>>((acc, s) => {
    const st = slotStatusForWindow(s, reservations, win);
    acc[st] = (acc[st] ?? 0) + 1;
    return acc;
  }, {});
  const free = counts.AVAILABLE ?? 0;
  const total = slots.length;
  const slotH = compact ? SLOT_H.compact : SLOT_H.full;

  // Entrance width for Row A = 2*slotW + GAP, matching the RampUp+RampDown pair in Row B
  const entranceW = (compact ? SLOT_W.compact : SLOT_W.full) * 2 + GAP;

  return (
    <div
      className={cn(
        "map-tint relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_-24px_rgba(2,6,23,0.65)] dark:border-border dark:bg-[#0F172A]/80 dark:shadow-none",
        compact ? "p-3" : "p-4 sm:p-5"
      )}
      style={{
        backgroundImage:
          "radial-gradient(560px 200px at 70% -20%, var(--map-glow-a), transparent 65%), radial-gradient(400px 180px at 0% 120%, var(--map-glow-b), transparent 60%)",
      }}
    >
      {/* header strip */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[9px] font-bold tracking-[0.18em] text-slate-400 dark:text-muted-foreground">
          {tr(lang, openlot ? "floorLabelOpen" : "floorLabel")}
        </span>
        <div className="flex items-center gap-1.5">
          {liveOn && guests.length > 0 && (
            <span className="tnum rounded-full border border-amber-400/40 bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-300">
              {guests.length} {tr(lang, "opGuests")}
            </span>
          )}
          <span className="tnum rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:border-green-400/25 dark:bg-green-400/10 dark:text-green-300">
            {free}/{total} {tr(lang, "slotWord")}
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="slim-scroll overflow-x-auto pb-1">
          <div style={{ width: "max-content", minWidth: "100%" }}>
          {openlot ? (
            /* ── open lot: Row A · lane with gates · Row B - no walls, no pillars ── */
            <div className="flex flex-col gap-1.5">
              <RowSlots slots={rowA} onSlotPress={onSlotPress} compact={compact} openlot highlightSlotType={highlightSlotType} />

              {/* lane + MASUK (left gate) + KELUAR (right gate) */}
              <div className="flex items-stretch gap-1.5">
                <div
                  className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-green-400 bg-green-50 px-2 dark:border-green-400/40 dark:bg-green-400/[0.06]"
                  style={{ width: compact ? 54 : 70, height: slotH }}
                >
                  <LogIn className={cn("text-green-600 dark:text-green-300", compact ? "h-3.5 w-3.5" : "h-4.5 w-4.5")} />
                  <span className="text-[8px] font-bold tracking-wider text-green-700 dark:text-green-300">
                    {tr(lang, "entranceLabel")}
                  </span>
                  {!compact && (
                    <span className="flex items-center gap-0.5 text-[7px] font-semibold text-green-500/80 dark:text-green-300/60">
                      <ArrowRight className="h-2.5 w-2.5" /> {lang === "id" ? "arah masuk" : "way in"}
                    </span>
                  )}
                </div>
                <div className="relative flex flex-1 items-center overflow-hidden rounded-lg bg-slate-100 dark:bg-white/[0.03]">
                  <div className="w-full border-t-2 border-dashed border-slate-300 dark:border-white/[0.08]" />
                  <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-[7.5px] font-semibold tracking-[0.2em] text-slate-400 dark:bg-background/80 dark:text-muted-foreground/60">
                    {lang === "id" ? "JALUR MOBIL" : "DRIVE LANE"}
                  </span>
                </div>
                <div
                  className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-slate-400 bg-slate-50 px-2 dark:border-slate-400/40 dark:bg-white/[0.05]"
                  style={{ width: compact ? 50 : 66, height: slotH }}
                >
                  <DoorOpen className={cn("text-slate-500 dark:text-slate-300", compact ? "h-3.5 w-3.5" : "h-4.5 w-4.5")} />
                  <span className="text-[8px] font-bold tracking-wider text-slate-500 dark:text-slate-300">
                    {tr(lang, "exitLabel")}
                  </span>
                  {!compact && (
                    <span className="flex items-center gap-0.5 text-[7px] font-semibold text-slate-400 dark:text-slate-400/70">
                      <ArrowRight className="h-2.5 w-2.5" /> {lang === "id" ? "arah keluar" : "way out"}
                    </span>
                  )}
                </div>
              </div>

              <RowSlots slots={rowB} onSlotPress={onSlotPress} compact={compact} openlot highlightSlotType={highlightSlotType} />
            </div>
          ) : (
            /* ── building deck (Anggrek/Kemanggisan) ── */
            <>
          {/* top wall */}
          <div className="mb-1.5 h-1.5 rounded-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-white/[0.06] dark:via-white/[0.14] dark:to-white/[0.06]" />

          {/* Row A: A-01…A-18, pillar every 3, WallStrip, Entrance */}
          <div className="flex items-stretch gap-1.5">
            <RowSlots slots={rowA} onSlotPress={onSlotPress} compact={compact} highlightSlotType={highlightSlotType} />
            <WallStrip h={slotH} />
            <div
              className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-green-400 bg-green-50 px-2 dark:border-green-400/40 dark:bg-green-400/[0.06]"
              style={{ width: entranceW, height: slotH }}
            >
              <LogIn className={cn("text-green-600 dark:text-green-300", compact ? "h-3.5 w-3.5" : "h-4.5 w-4.5")} />
              <span className="text-[8px] font-bold tracking-wider text-green-700 dark:text-green-300">
                {tr(lang, "entranceLabel")}
              </span>
              {!compact && (
                <span className="flex items-center gap-0.5 text-[7px] font-semibold text-green-500/80 dark:text-green-300/60">
                  <ArrowLeft className="h-2.5 w-2.5" /> {lang === "id" ? "arah masuk" : "way in"}
                </span>
              )}
            </div>
          </div>

          {/* drive lane */}
          <div className="relative my-1.5 flex h-9 items-center overflow-hidden rounded-lg bg-slate-100 dark:bg-white/[0.03]">
            <div className="w-full border-t-2 border-dashed border-slate-300 dark:border-white/[0.08]" />
            <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-[7.5px] font-semibold tracking-[0.2em] text-slate-400 dark:bg-background/80 dark:text-muted-foreground/60">
              {lang === "id" ? "JALUR MOBIL" : "DRIVE LANE"}
            </span>
          </div>

          {/* Row B - custom layout component */}
          <RowB slots={rowB} onSlotPress={onSlotPress} compact={compact} highlightSlotType={highlightSlotType} />

          {/* bottom wall */}
          <div className="mt-1.5 h-1.5 rounded-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-white/[0.06] dark:via-white/[0.14] dark:to-white/[0.06]" />
            </>
          )}
            </div>
        </div>
        {/* scroll affordance fades */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-3xl bg-gradient-to-r from-white to-transparent dark:from-[#0F172A]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-3xl bg-gradient-to-l from-white to-transparent dark:from-[#0F172A]"
        />
      </div>

      {/* footer note */}
      {!compact && (
        <p className="mt-3 text-center text-[10px] leading-snug text-slate-500 dark:text-muted-foreground/70">
          {tr(lang, openlot ? "mapNoteOpen" : "mapNote")}
          {liveOn && guests.length > 0 && (
            <span className="ml-1 font-semibold text-amber-600 dark:text-amber-300/80">
              · {tr(lang, "liveMapNote")}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

/** Legend chips shown under maps */
export function MapLegend() {
  const lang = useParkir((s) => s.lang);
  const items: { k: SlotStatus; label: string; cls: string }[] = [
    { k: "AVAILABLE", label: tr(lang, "available"), cls: "bg-green-400" },
    { k: "RESERVED", label: tr(lang, "reserved"), cls: "bg-amber-400" },
    { k: "OCCUPIED", label: tr(lang, "occupied"), cls: "bg-red-400/70" },
    { k: "MAINTENANCE", label: tr(lang, "maintenance"), cls: "bg-slate-500" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-medium text-muted-foreground">
      {items.map((i) => (
        <span key={i.k} className="inline-flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-[4px]", i.cls)} />
          {i.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <Zap className="h-2.5 w-2.5 text-green-500 dark:text-green-400" />
        {tr(lang, "slotTypeEv")}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Accessibility className="h-2.5 w-2.5 text-blue-500 dark:text-blue-400" />
        {tr(lang, "slotTypeDisability")}
      </span>
    </div>
  );
}

/** Count helper for headers - includes live guests when the stream is on. */
export function useMapCounts(): { free: number; total: number; pct: number; guests: number } {
  const slots = useParkir((s) => s.slots);
  const reservations = useParkir((s) => s.reservations);
  const win = useParkir((s) => s.viewWindow);
  const guests = useParkir((s) => s.liveGuests);
  const liveOn = useParkir((s) => s.liveOn);
  return React.useMemo(() => {
    let free = 0;
    let taken = 0;
    slots.forEach((s) => {
      const st = slotStatusForWindow(s, reservations, win);
      if (st === "AVAILABLE") free++;
      else if (st !== "MAINTENANCE") taken++;
    });
    return {
      free,
      total: slots.length,
      pct: Math.round((taken / Math.max(1, slots.length)) * 100),
      guests: liveOn ? guests.length : 0,
    };
  }, [slots, reservations, win, guests, liveOn]);
}

export type { Slot, Reservation, TimeWindow };
