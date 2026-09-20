"use client";
/**
 * ParkingMap — site plan of the active campus, theme-aware.
 * Two layouts:
 *  · "building" (Anggrek)  — walled deck: pillars every 3 bays, LIFT/WC,
 *    right-side entrance/exit + the big seamless L2 RAMP BLOCK (v25): one
 *    monolithic wall·ramp·wall child — no gaps, no dark slits.
 *  · "openlot"  (Alam Sutera) — open lot: A(20) · drive lane · B(20).
 *
 * v23: when the live gate stream is connected, guest cars appear as amber
 * ringing tiles (overlay only — never in reservations/transactions).
 */
import React from "react";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CarFront,
  Clock3,
  DoorOpen,
  LogIn,
  Wrench,
} from "lucide-react";
import {
  ROW_B_LEFT,
  L2RAMP_BLOCK_W,
  L2RAMP_WALL_W,
  L2RAMP_GAP,
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

const STYLE: Record<
  SlotStatus,
  { box: string; num: string; dot: string }
> = {
  AVAILABLE: {
    box: "border-emerald-300 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400 hover:shadow-[0_0_20px_-4px_rgba(16,185,129,0.45)] dark:border-emerald-400/35 dark:bg-emerald-400/[0.07] dark:hover:bg-emerald-400/[0.14] dark:hover:border-emerald-400/60 dark:hover:shadow-[0_0_20px_-4px_rgba(52,211,153,0.5)] cursor-pointer",
    num: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.65)] dark:bg-emerald-400 dark:shadow-[0_0_6px_rgba(52,211,153,0.9)]",
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

/** Open-lot bay fills — bays sit adjacent, separated by thin paint lines (divide-x). */
const OPENLOT_FILL: Record<SlotStatus, string> = {
  AVAILABLE:
    "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-400/[0.07] dark:hover:bg-emerald-400/[0.14] cursor-pointer",
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
}: {
  slot: Slot;
  status: SlotStatus;
  onSlotPress?: (s: Slot) => void;
  compact?: boolean;
  openlot?: boolean;
  live?: LiveGuest;
}) {
  const st = STYLE[status];
  const disabled = status !== "AVAILABLE";
  return (
    <button
      type="button"
      disabled={disabled || !onSlotPress}
      onClick={() => onSlotPress?.(slot)}
      aria-label={`Slot ${slot.slotNumber} — ${status}`}
      title={live ? `${slot.slotNumber} · ${live.vehicle} (tamu live)` : `${slot.slotNumber} · ${status}`}
      data-live-guest={live ? slot.slotNumber : undefined}
      className={cn(
        "group relative flex shrink-0 flex-col items-center justify-center gap-1 transition-all duration-200",
        compact ? "h-12 w-11" : "h-16 w-[52px]",
        openlot
          ? cn("rounded-none", OPENLOT_FILL[status])
          : cn("rounded-xl border", st.box),
        live && "ring-2 ring-amber-400 ring-offset-1 ring-offset-white dark:ring-offset-[#0a0f1e]",
        disabled && "cursor-default",
        !disabled && "active:scale-95"
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

function Pillar({ h }: { h: number }) {
  return (
    <div
      aria-hidden
      className="w-1.5 shrink-0 self-stretch rounded-full bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200 dark:from-white/[0.07] dark:via-white/[0.13] dark:to-white/[0.07]"
      style={{ minHeight: h }}
    />
  );
}

/** Tembok — wall strip after the last slot of a row (v20/v25, aligned A↔B). */
function WallStrip({ h }: { h: number }) {
  return (
    <div
      aria-hidden
      className="w-2.5 shrink-0 self-stretch rounded-full bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200 dark:from-white/[0.06] dark:via-white/[0.14] dark:to-white/[0.06]"
      style={{ minHeight: h }}
    />
  );
}

/**
 * RampBlockBox (v25) — the L2 down-ramp as ONE seamless child: integrated 8px
 * wall edge strips on both sides + the blue ramp body with chevrons. Replaces
 * the old wall·ramp·wall triple — no dark slit can appear between the walls
 * and the ramp anymore.
 */
function RampBlockBox({ compact, h }: { compact: boolean; h: number }) {
  const lang = useParkir((s) => s.lang);
  const blockW = compact ? L2RAMP_BLOCK_W.compact : L2RAMP_BLOCK_W.full;
  return (
    <div
      data-map-el="ramp-l2"
      aria-label="Ramp turun Lantai 2"
      className="flex shrink-0 items-stretch overflow-hidden rounded-xl border border-slate-300 dark:border-white/[0.12]"
      style={{ width: blockW, height: h }}
    >
      {/* integrated wall edge — left */}
      <div
        aria-hidden
        className="h-full bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200 dark:from-white/[0.06] dark:via-white/[0.14] dark:to-white/[0.06]"
        style={{ width: L2RAMP_WALL_W }}
      />
      <div aria-hidden style={{ width: L2RAMP_GAP }} />
      {/* ramp body */}
      <div className="relative flex h-full flex-1 flex-col items-center justify-center gap-1 bg-gradient-to-b from-sky-100 to-blue-50 dark:from-binus-blue/35 dark:to-binus-blue/20">
        <span
          aria-hidden
          className="absolute inset-y-1 left-0.5 flex flex-col justify-around"
          style={{ opacity: 0.45 }}
        >
          {[0, 1, 2, 3].map((i) => (
            <svg key={i} viewBox="0 0 10 6" className="h-[6px] w-[10px] text-blue-500 dark:text-binus-bright" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M1 1l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ))}
        </span>
        <ArrowDown className="h-4 w-4 text-blue-600 dark:text-binus-bright" />
        <span className="text-[7.5px] font-black leading-none tracking-wider text-blue-700 dark:text-binus-bright/90">
          {lang === "id" ? "RAMP" : "RAMP"}
        </span>
        <span className="rounded-sm bg-blue-600/90 px-1 text-[6.5px] font-black leading-[10px] text-white dark:bg-binus-bright/90 dark:text-[#0b1226]">
          L2 ↓
        </span>
      </div>
      <div aria-hidden style={{ width: L2RAMP_GAP }} />
      {/* integrated wall edge — right */}
      <div
        aria-hidden
        className="h-full bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200 dark:from-white/[0.06] dark:via-white/[0.14] dark:to-white/[0.06]"
        style={{ width: L2RAMP_WALL_W }}
      />
    </div>
  );
}

function RowSlots({
  slots,
  onSlotPress,
  compact,
  liftWC,
  openlot,
}: {
  slots: Slot[];
  onSlotPress?: (s: Slot) => void;
  compact?: boolean;
  liftWC?: boolean;
  openlot?: boolean;
}) {
  const lang = useParkir((s) => s.lang);
  const reservations = useParkir((s) => s.reservations);
  const win = useParkir((s) => s.viewWindow);
  const guestMap = useGuestMap();
  const slotH = compact ? 48 : 64;

  // Open lot — one continuous strip of bays divided by thin paint lines.
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
          />
        ))}
      </div>
    );
  }

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
      />
    );
    const isLast = i === slots.length - 1;
    const isPillarPos = (i + 1) % 3 === 0;
    // Insert LIFT + WC after 8th slot of row B
    if (liftWC && i === ROW_B_LEFT - 1) {
      chunk.push(
        <div key="lift" className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-1 dark:border-binus-bright/30 dark:bg-binus-bright/[0.08]" style={{ width: compact ? 38 : 46, height: slotH }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("text-blue-600 dark:text-binus-bright", compact ? "h-3 w-3" : "h-4 w-4")} aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M8 12V8M16 12v4" strokeLinecap="round" />
            <path d="m6 10 2-2 2 2M14 14l2 2 2-2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[7.5px] font-bold text-blue-600 dark:text-binus-bright">{tr(lang, "liftLabel")}</span>
        </div>,
        <div key="wc" className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-violet-200 bg-violet-50 px-1 dark:border-violet-400/30 dark:bg-violet-400/[0.07]" style={{ width: compact ? 38 : 46, height: slotH }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("text-violet-500 dark:text-violet-300", compact ? "h-3 w-3" : "h-4 w-4")} aria-hidden>
            <circle cx="7.5" cy="4.5" r="1.8" />
            <path d="M7.5 8v6M5.5 14h4l-1 7h-2z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16.5" cy="4.5" r="1.8" />
            <path d="M16.5 8v4m0 0c-1.4 0-2.5 1-2.5 2.5V21h5v-6.5c0-1.5-1.1-2.5-2.5-2.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[7.5px] font-bold text-violet-600 dark:text-violet-300">{tr(lang, "wcLabel")}</span>
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
  const slotH = compact ? 48 : 64;

  return (
    <div
      className={cn(
        "map-tint relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_-24px_rgba(2,6,23,0.65)] dark:border-border dark:bg-[#0a0f1e]/80 dark:shadow-none",
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
          <span className="tnum rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300">
            {free}/{total} {tr(lang, "slotWord")}
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="slim-scroll overflow-x-auto pb-1">
          <div style={{ width: "max-content", minWidth: "100%" }}>
          {openlot ? (
            /* ── open lot: Row A · lane with gates · Row B — no walls, no pillars ── */
            <div className="flex flex-col gap-1.5">
              <RowSlots slots={rowA} onSlotPress={onSlotPress} compact={compact} openlot />

              {/* lane + MASUK (left gate) + KELUAR (right gate) */}
              <div className="flex items-stretch gap-1.5">
                <div
                  className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-emerald-400 bg-emerald-50 px-2 dark:border-emerald-400/40 dark:bg-emerald-400/[0.06]"
                  style={{ width: compact ? 54 : 70, height: slotH }}
                >
                  <LogIn className={cn("text-emerald-600 dark:text-emerald-300", compact ? "h-3.5 w-3.5" : "h-4.5 w-4.5")} />
                  <span className="text-[8px] font-bold tracking-wider text-emerald-700 dark:text-emerald-300">
                    {tr(lang, "entranceLabel")}
                  </span>
                  {!compact && (
                    <span className="flex items-center gap-0.5 text-[7px] font-semibold text-emerald-500/80 dark:text-emerald-300/60">
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

              <RowSlots slots={rowB} onSlotPress={onSlotPress} compact={compact} openlot />
            </div>
          ) : (
            /* ── building deck (Anggrek): walls, pillars, facilities, gates, L2 ramp block ── */
            <>
          {/* top wall */}
          <div className="mb-1.5 h-1.5 rounded-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-white/[0.06] dark:via-white/[0.14] dark:to-white/[0.06]" />

          {/* Row A + tembok A + entrance */}
          <div className="flex items-stretch gap-1.5">
            <RowSlots slots={rowA} onSlotPress={onSlotPress} compact={compact} />
            <WallStrip h={slotH} />
            <div
              className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-emerald-400 bg-emerald-50 px-2 dark:border-emerald-400/40 dark:bg-emerald-400/[0.06]"
              style={{ width: compact ? 64 : 84, height: slotH }}
            >
              <LogIn className={cn("text-emerald-600 dark:text-emerald-300", compact ? "h-3.5 w-3.5" : "h-4.5 w-4.5")} />
              <span className="text-[8px] font-bold tracking-wider text-emerald-700 dark:text-emerald-300">
                {tr(lang, "entranceLabel")}
              </span>
              {!compact && (
                <span className="flex items-center gap-0.5 text-[7px] font-semibold text-emerald-500/80 dark:text-emerald-300/60">
                  <ArrowLeft className="h-2.5 w-2.5" /> {lang === "id" ? "arah masuk" : "way in"}
                </span>
              )}
            </div>
          </div>

          {/* lane */}
          <div className="relative my-1.5 flex h-9 items-center overflow-hidden rounded-lg bg-slate-100 dark:bg-white/[0.03]">
            <div className="w-full border-t-2 border-dashed border-slate-300 dark:border-white/[0.08]" />
            <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-[7.5px] font-semibold tracking-[0.2em] text-slate-400 dark:bg-background/80 dark:text-muted-foreground/60">
              {lang === "id" ? "JALUR MOBIL" : "DRIVE LANE"}
            </span>
          </div>

          {/* Row B + tembok B + exit + seamless L2 ramp block */}
          <div className="flex items-stretch gap-1.5">
            <RowSlots slots={rowB} onSlotPress={onSlotPress} compact={compact} liftWC />
            <WallStrip h={slotH} />
            <div
              className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-2 dark:border-slate-400/30 dark:bg-white/[0.03]"
              style={{ width: compact ? 52 : 64, height: slotH }}
            >
              <DoorOpen className={cn("text-slate-500 dark:text-slate-400", compact ? "h-3.5 w-3.5" : "h-4.5 w-4.5")} />
              <span className="text-[8px] font-bold tracking-wider text-slate-500 dark:text-slate-400">
                {tr(lang, "exitLabel")}
              </span>
            </div>
            <RampBlockBox compact={!!compact} h={slotH} />
          </div>

          {/* bottom wall */}
          <div className="mt-1.5 h-1.5 rounded-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-white/[0.06] dark:via-white/[0.14] dark:to-white/[0.06]" />
            </>
          )}
            </div>
        </div>
        {/* scroll affordance fades */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-3xl bg-gradient-to-r from-white to-transparent dark:from-[#0a0f1e]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-3xl bg-gradient-to-l from-white to-transparent dark:from-[#0a0f1e]"
        />
      </div>

      {/* footer note */}
      {!compact && (
        <p className="mt-3 text-center text-[10px] leading-snug text-slate-400 dark:text-muted-foreground/70">
          {tr(lang, openlot ? "mapNoteOpen" : "mapNote")}
          {liveOn && guests.length > 0 && (
            <span className="ml-1 font-semibold text-amber-500 dark:text-amber-300/80">
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

/** Count helper for headers — includes live guests when the stream is on. */
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
