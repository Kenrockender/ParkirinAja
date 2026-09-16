"use client";
/**
 * ParkingMap — modern minimal "seat-map" style site plan of Anggrek L1.
 * Row A (18 bays) + ENTRANCE · lane · Row B (14 bays with LIFT/WC) · ramp.
 */
import React from "react";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowLeft,
  CarFront,
  Clock3,
  DoorOpen,
  LogIn,
  Wrench,
} from "lucide-react";
import {
  ROW_B_LEFT,
  slotStatusForWindow,
  type Slot,
  type SlotStatus,
  type TimeWindow,
  type Reservation,
  tr,
} from "@/lib/parking-data";
import { useParkir } from "@/lib/store";

const STYLE: Record<
  SlotStatus,
  { box: string; num: string; dot: string }
> = {
  AVAILABLE: {
    box: "border-emerald-300 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400 hover:shadow-[0_0_20px_-4px_rgba(16,185,129,0.45)] cursor-pointer",
    num: "text-emerald-700",
    dot: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.65)]",
  },
  RESERVED: {
    box: "border-amber-200 bg-amber-50",
    num: "text-amber-600",
    dot: "bg-amber-400",
  },
  OCCUPIED: {
    box: "border-red-200 bg-red-50",
    num: "text-red-500",
    dot: "bg-red-400/70",
  },
  MAINTENANCE: {
    box: "border-slate-200 bg-slate-100",
    num: "text-slate-400",
    dot: "bg-slate-400",
  },
};

function SlotBay({
  slot,
  status,
  onSlotPress,
  compact,
}: {
  slot: Slot;
  status: SlotStatus;
  onSlotPress?: (s: Slot) => void;
  compact?: boolean;
}) {
  const st = STYLE[status];
  const disabled = status !== "AVAILABLE";
  return (
    <button
      type="button"
      disabled={disabled || !onSlotPress}
      onClick={() => onSlotPress?.(slot)}
      aria-label={`Slot ${slot.slotNumber} — ${status}`}
      title={`${slot.slotNumber} · ${status}`}
      className={cn(
        "group relative flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border transition-all duration-200",
        compact ? "h-12 w-11" : "h-16 w-[52px]",
        st.box,
        disabled && "cursor-default",
        !disabled && "active:scale-95"
      )}
    >
      {status === "AVAILABLE" && (
        <span className={cn("absolute right-1.5 top-1.5 h-1 w-1 rounded-full", st.dot)} />
      )}
      {status === "OCCUPIED" && <CarFront className={cn("h-3 w-3 text-red-400", compact ? "hidden" : "block", "opacity-80")} />}
      {status === "RESERVED" && <Clock3 className={cn("h-3 w-3 text-amber-500 opacity-70", compact && "hidden")} />}
      {status === "MAINTENANCE" && <Wrench className={cn("h-3 w-3 text-slate-400 opacity-80", compact && "hidden")} />}
      <span
        className={cn(
          "tnum font-display font-semibold tracking-tight",
          compact ? "text-[9.5px]" : "text-[11px]",
          st.num
        )}
      >
        {slot.slotNumber}
      </span>
    </button>
  );
}

function Pillar({ h }: { h: number }) {
  return (
    <div
      aria-hidden
      className="w-1.5 shrink-0 self-stretch rounded-full bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200"
      style={{ minHeight: h }}
    />
  );
}

function RowSlots({
  slots,
  onSlotPress,
  compact,
  liftWC,
}: {
  slots: Slot[];
  onSlotPress?: (s: Slot) => void;
  compact?: boolean;
  liftWC?: boolean;
}) {
  const lang = useParkir((s) => s.lang);
  const reservations = useParkir((s) => s.reservations);
  const win = useParkir((s) => s.viewWindow);
  const slotH = compact ? 48 : 64;

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
      />
    );
    const isLast = i === slots.length - 1;
    const isPillarPos = (i + 1) % 3 === 0;
    // Insert LIFT + WC after 8th slot of row B
    if (liftWC && i === ROW_B_LEFT - 1) {
      chunk.push(
        <div key="lift" className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-1" style={{ width: compact ? 38 : 46, height: slotH }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("text-blue-600", compact ? "h-3 w-3" : "h-4 w-4")} aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M8 12V8M16 12v4" strokeLinecap="round" />
            <path d="m6 10 2-2 2 2M14 14l2 2 2-2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[7.5px] font-bold text-blue-600">{tr(lang, "liftLabel")}</span>
        </div>,
        <div key="wc" className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-violet-200 bg-violet-50 px-1" style={{ width: compact ? 38 : 46, height: slotH }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("text-violet-500", compact ? "h-3 w-3" : "h-4 w-4")} aria-hidden>
            <circle cx="7.5" cy="4.5" r="1.8" />
            <path d="M7.5 8v6M5.5 14h4l-1 7h-2z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16.5" cy="4.5" r="1.8" />
            <path d="M16.5 8v4m0 0c-1.4 0-2.5 1-2.5 2.5V21h5v-6.5c0-1.5-1.1-2.5-2.5-2.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[7.5px] font-bold text-violet-600">{tr(lang, "wcLabel")}</span>
        </div>
      );
    }
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

export function ParkingMap({
  onSlotPress,
  compact,
}: {
  onSlotPress?: (s: Slot) => void;
  compact?: boolean;
}) {
  const lang = useParkir((s) => s.lang);
  const slots = useParkir((s) => s.slots);
  const reservations = useParkir((s) => s.reservations);
  const win = useParkir((s) => s.viewWindow);

  const rowA = slots.filter((s) => s.rowLabel === "A");
  const rowB = slots.filter((s) => s.rowLabel === "B");

  const counts = slots.reduce<Record<string, number>>((acc, s) => {
    const st = slotStatusForWindow(s, reservations, win);
    acc[st] = (acc[st] ?? 0) + 1;
    return acc;
  }, {});
  const free = counts.AVAILABLE ?? 0;
  const total = slots.length;
  const slotH = compact ? 48 : 64;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_-24px_rgba(2,6,23,0.65)]",
        compact ? "p-3" : "p-4 sm:p-5"
      )}
      style={{
        backgroundImage:
          "radial-gradient(560px 200px at 70% -20%, rgba(59,130,246,0.06), transparent 65%), radial-gradient(400px 180px at 0% 120%, rgba(250,204,21,0.08), transparent 60%)",
      }}
    >
      {/* header strip */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[9px] font-bold tracking-[0.18em] text-slate-400">
          {tr(lang, "floorLabel")}
        </span>
        <span className="tnum rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          {free}/{total} {tr(lang, "slotWord")}
        </span>
      </div>

      <div className="relative">
        <div className="slim-scroll overflow-x-auto pb-1">
          <div style={{ width: "max-content", minWidth: "100%" }}>
          {/* top wall */}
          <div className="mb-1.5 h-1.5 rounded-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />

          {/* Row A + entrance */}
          <div className="flex items-stretch gap-1.5">
            <RowSlots slots={rowA} onSlotPress={onSlotPress} compact={compact} />
            <div
              className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-emerald-400 bg-emerald-50 px-2"
              style={{ width: compact ? 64 : 84, height: slotH }}
            >
              <LogIn className={cn("text-emerald-600", compact ? "h-3.5 w-3.5" : "h-4.5 w-4.5")} />
              <span className="text-[8px] font-bold tracking-wider text-emerald-700">
                {tr(lang, "entranceLabel")}
              </span>
              {!compact && (
                <span className="flex items-center gap-0.5 text-[7px] font-semibold text-emerald-500/80">
                  <ArrowLeft className="h-2.5 w-2.5" /> {lang === "id" ? "arah masuk" : "way in"}
                </span>
              )}
            </div>
          </div>

          {/* lane */}
          <div className="relative my-1.5 flex h-9 items-center overflow-hidden rounded-lg bg-slate-100">
            <div className="w-full border-t-2 border-dashed border-slate-300" />
            <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-[7.5px] font-semibold tracking-[0.2em] text-slate-400">
              {lang === "id" ? "JALUR MOBIL" : "DRIVE LANE"}
            </span>
          </div>

          {/* Row B + ramp/exit */}
          <div className="flex items-stretch gap-1.5">
            <RowSlots slots={rowB} onSlotPress={onSlotPress} compact={compact} liftWC />
            <div
              className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-2"
              style={{ width: compact ? 52 : 64, height: slotH }}
            >
              <DoorOpen className={cn("text-slate-500", compact ? "h-3.5 w-3.5" : "h-4.5 w-4.5")} />
              <span className="text-[8px] font-bold tracking-wider text-slate-500">
                {tr(lang, "exitLabel")}
              </span>
            </div>
            <div
              className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-1.5"
              style={{ width: compact ? 34 : 42, height: slotH }}
            >
              <ArrowDown className={cn("text-blue-600", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
              <span className="text-[7px] font-bold text-blue-600 [writing-mode:vertical-rl]">
                {tr(lang, "rampLabel")}
              </span>
            </div>
          </div>

          {/* bottom wall */}
          <div className="mt-1.5 h-1.5 rounded-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />
            </div>
        </div>
        {/* scroll affordance fades */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-3xl bg-gradient-to-r from-white to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-3xl bg-gradient-to-l from-white to-transparent"
        />
      </div>

      {/* footer note */}
      {!compact && (
        <p className="mt-3 text-center text-[10px] leading-snug text-slate-400">
          {tr(lang, "mapNote")}
        </p>
      )}
    </div>
  );
}

/** Legend chips shown under maps */
export function MapLegend() {
  const lang = useParkir((s) => s.lang);
  const items: { k: SlotStatus; label: string; cls: string }[] = [
    { k: "AVAILABLE", label: tr(lang, "available"), cls: "bg-emerald-400" },
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
    </div>
  );
}

/** Count helper for headers */
export function useMapCounts(): { free: number; total: number; pct: number } {
  const slots = useParkir((s) => s.slots);
  const reservations = useParkir((s) => s.reservations);
  const win = useParkir((s) => s.viewWindow);
  return React.useMemo(() => {
    let free = 0;
    let taken = 0;
    slots.forEach((s) => {
      const st = slotStatusForWindow(s, reservations, win);
      if (st === "AVAILABLE") free++;
      else if (st !== "MAINTENANCE") taken++;
    });
    return { free, total: slots.length, pct: Math.round((taken / Math.max(1, slots.length)) * 100) };
  }, [slots, reservations, win]);
}

export type { Slot, Reservation };
