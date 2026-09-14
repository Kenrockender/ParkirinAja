"use client";
/**
 * ParkingMap — site-plan layout matching real Binus Anggrek Lantai B:
 * - Row A (top, 18 slots) + ENTRANCE at top-right corner
 * - Driving lane in the middle (no text)
 * - Row B (bottom): B-01..B-08 | LIFT | WC | B-09..B-14
 * - Ramp indicator on right side
 * - Exit indicator ("KE LN 3") on bottom-left
 * Each slot has a permanent QR (like EV charger) scanned by user's phone.
 */
import React from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { CarFront, CircleCheck, Clock3, LogIn, ArrowDown, ArrowLeft, Wrench, DoorOpen } from "lucide-react";

export interface SlotVM {
  id: string;
  slotNumber: string;
  rowLabel: string;
  colIndex: number;
  displayStatus: "AVAILABLE" | "RESERVED" | "OCCUPIED" | "MAINTENANCE";
}

const STYLE = {
  AVAILABLE: { 
    chip: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800", 
    icon: CircleCheck, 
    iconCls: "text-emerald-600 dark:text-emerald-400" 
  },
  RESERVED: { 
    chip: "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 border-amber-200 dark:border-amber-800", 
    icon: Clock3, 
    iconCls: "text-amber-600 dark:text-amber-400" 
  },
  OCCUPIED: { 
    chip: "bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-100 border-red-200 dark:border-red-800", 
    icon: CarFront, 
    iconCls: "text-red-500 dark:text-red-400" 
  },
  MAINTENANCE: { 
    chip: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700", 
    icon: Wrench, 
    iconCls: "text-zinc-400 dark:text-zinc-500" 
  },
} as const;

function SlotBay({ s, onSlotPress, selected, showPillar, showYellowLine }: { 
  s: SlotVM; 
  onSlotPress?: (slot: SlotVM) => void; 
  selected?: boolean;
  showPillar?: boolean;
  showYellowLine?: boolean;
}) {
  const st = STYLE[s.displayStatus];
  const Icon = st.icon;
  const disabled = s.displayStatus !== "AVAILABLE";
  
  return (
    <div className="flex items-center gap-0">
      <button
        type="button"
        disabled={disabled || !onSlotPress}
        onClick={() => onSlotPress?.(s)}
        aria-label={`Slot ${s.slotNumber} — ${s.displayStatus}`}
        title={`${s.slotNumber} (${s.displayStatus})`}
        className={cn(
          "group relative transition-all flex-1",
          !disabled && "cursor-pointer hover:brightness-95 active:brightness-100",
          disabled && "opacity-80",
          selected && "ring-2 ring-primary ring-offset-1"
        )}
        style={{ height: '80px' }}
      >
        {/* Parking slot shape - rectangular like real parking bay */}
        <div className={cn(
          "relative h-full w-full rounded-sm border-2 flex items-center justify-center",
          st.chip
        )}>
          {/* Icon and label */}
          <div className="flex flex-col items-center justify-center gap-0.5">
            <Icon className={cn("h-4 w-4", st.iconCls)} />
            <span className="text-[10px] font-bold leading-none">{s.slotNumber}</span>
          </div>
        </div>
      </button>
      
      {/* Yellow line separator between cars (not before pillar, not after last slot) */}
      {showYellowLine && (
        <div className="w-[3px] h-[80px] bg-yellow-400 dark:bg-yellow-500 mx-0" 
             title="Marka kuning" />
      )}
      
      {/* Pillar every 3 slots */}
      {showPillar && (
        <div className="w-[8px] h-[80px] bg-zinc-600 dark:bg-zinc-500 mx-0 rounded-sm" 
             title="Tiang/Kolom" />
      )}
    </div>
  );
}

/* Total grid columns: 
 * Row A: 18 slots + 3 cols for entrance = 21 cols + 1 col right gutter for ramp
 * Row B: 8 slots + 2 cols LIFT/WC + 6 slots + remaining space
 * We use 22 columns total (18 slots + 3 entrance + 1 ramp strip)
 */
const TOTAL_COLS = 22; // 18 slot cols + 3 entrance + 1 ramp
const ROW_A_SLOTS = 18;
const ROW_B_LEFT = 8; // B-01 to B-08
const ROW_B_RIGHT = 6; // B-09 to B-14
const LIFT_WC_COLS = 2; // LIFT takes 1 col, WC takes 1 col
// Position of LIFT/WC in the bottom row grid: after col 8, before col 11
const LIFT_COL_START = ROW_B_LEFT + 1; // col 9
const WC_COL_END = LIFT_COL_START + LIFT_WC_COLS; // col 11
// Right-side slots start after LIFT/WC
// But we also need gap columns. Let's just use 2 gap cols for LIFT/WC area (cols 9-10)
// Then B-09 starts at col 11

export function ParkingMap({
  slots,
  onSlotPress,
  selectedId,
}: {
  slots: SlotVM[];
  onSlotPress?: (slot: SlotVM) => void;
  selectedId?: string | null;
}) {
  const { t } = useI18n();

  const rows = React.useMemo(() => {
    const grouped: Record<string, SlotVM[]> = {};
    slots.forEach((s) => {
      grouped[s.rowLabel] = grouped[s.rowLabel] || [];
      grouped[s.rowLabel].push(s);
    });
    (Object.keys(grouped) as (keyof typeof grouped)[]).forEach((k) =>
      grouped[k].sort((a, b) => a.colIndex - b.colIndex)
    );
    return grouped;
  }, [slots]);

  // Grid row definitions:
  // 1: top wall
  // 2: Row A (parking slots)
  // 3: driving lane
  // 4: Row B (parking slots)
  // 5: bottom wall
  const G = {
    wallTop: 1,
    rowA: 2,
    lane: 3,
    rowB: 4,
    wallBottom: 5,
  };

  const rowASlots = rows["A"] ?? [];
  const rowBSlots = rows["B"] ?? [];
  const rowBLeft = rowBSlots.filter(s => s.colIndex < ROW_B_LEFT);
  const rowBRight = rowBSlots.filter(s => s.colIndex >= ROW_B_LEFT);

  return (
    <div aria-label="Parking map" className="rounded-2xl border bg-white dark:bg-card p-3 shadow-sm">
      {/* title */}
      <div className="mb-2 flex items-center justify-between text-[10px] font-bold tracking-wide text-muted-foreground">
        <span>LANTAI 1 — GEDUNG PARKIR ANGGREK</span>
        <span className="rounded-full bg-muted px-2 py-0.5 font-semibold">{slots.length} {t("slotWord")}</span>
      </div>

      <div
        className="grid gap-[3px]"
        style={{ 
          gridTemplateColumns: `repeat(${ROW_A_SLOTS}, minmax(0, 1fr)) auto auto auto auto`,
          gridTemplateRows: "8px 80px 28px 80px 8px",
        }}
      >
        {/* ═══════ TOP WALL ═══════ */}
        <div 
          style={{ gridRow: G.wallTop, gridColumn: `1 / -1` }} 
          className="rounded-sm bg-zinc-400 dark:bg-zinc-600" 
        />

        {/* ═══════ ROW A — 18 perpendicular parking bays (top) ═══════ */}
        {rowASlots.map((s, idx) => {
          const isLastInRow = idx === rowASlots.length - 1;
          const isPillarPosition = (idx + 1) % 3 === 0 && !isLastInRow;
          return (
            <div 
              key={s.id} 
              style={{ gridRow: G.rowA, gridColumn: s.colIndex + 1 }}
            >
              <SlotBay 
                s={s} 
                onSlotPress={onSlotPress} 
                selected={selectedId === s.id}
                showPillar={isPillarPosition}
                showYellowLine={!isPillarPosition && !isLastInRow}
              />
            </div>
          );
        })}

        {/* ═══════ ENTRANCE — top-right corner (green, 3 cols wide) ═══════ */}
        <div
          style={{ gridRow: G.rowA, gridColumn: `${ROW_A_SLOTS + 1} / ${ROW_A_SLOTS + 5}` }}
          className="flex h-[80px] flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-1 text-center"
        >
          <LogIn className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[10px] font-bold leading-tight text-emerald-700 dark:text-emerald-300">{t("entranceLabel")}</span>
          <span className="flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600/70 dark:text-emerald-400/70">
            <ArrowLeft className="h-3 w-3" /> {t("carIn")}
          </span>
        </div>

        {/* ═══════ DRIVING LANE — clean, no text ═══════ */}
        <div
          style={{ gridRow: G.lane, gridColumn: `1 / ${ROW_A_SLOTS + 1}` }}
          className="flex items-center justify-center rounded-sm bg-zinc-100 dark:bg-zinc-800/50"
        >
          {/* Subtle road markings */}
          <div className="w-full h-[2px] border-t-2 border-dashed border-zinc-300 dark:border-zinc-600 mx-2" />
        </div>

        {/* ═══════ RAMP AREA — right side spanning lane + row B ═══════ */}
        <div
          style={{ gridRow: `${G.lane} / ${G.wallBottom + 1}`, gridColumn: `${ROW_A_SLOTS + 3} / ${ROW_A_SLOTS + 5}` }}
          className="flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-zinc-400 dark:border-zinc-500 bg-zinc-100 dark:bg-zinc-800/50 px-1 text-center"
        >
          <ArrowDown className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          <span className="text-[7px] font-bold text-zinc-500 dark:text-zinc-400 leading-tight [writing-mode:vertical-rl]">{t("rampDown")}</span>
        </div>

        {/* ═══════ ROW B LEFT — B-01 to B-08 ═══════ */}
        {/* Exit indicator at bottom-left (before B-01) */}
        <div
          style={{ gridRow: `${G.lane} / ${G.rowB + 1}`, gridColumn: `${ROW_A_SLOTS + 1} / ${ROW_A_SLOTS + 3}` }}
          className="flex flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed border-zinc-400 dark:border-zinc-500 bg-zinc-100 dark:bg-zinc-800/50 px-0.5 text-center"
        >
          <DoorOpen className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          <span className="text-[7px] font-bold text-zinc-500 dark:text-zinc-400 leading-tight">{t("exitLabel")}</span>
        </div>

        {rowBLeft.map((s, idx) => {
          const isLastInRow = idx === rowBLeft.length - 1;
          const isPillarPosition = (idx + 1) % 3 === 0 && !isLastInRow;
          return (
            <div 
              key={s.id} 
              style={{ gridRow: G.rowB, gridColumn: s.colIndex + 1 }}
            >
              <SlotBay 
                s={s} 
                onSlotPress={onSlotPress} 
                selected={selectedId === s.id}
                showPillar={isPillarPosition}
                showYellowLine={!isPillarPosition && !isLastInRow}
              />
            </div>
          );
        })}

        {/* ═══════ LIFT — decorative (1 col) - BLUE ═══════ */}
        <div
          style={{ gridRow: G.rowB, gridColumn: ROW_B_LEFT + 1 }}
          className="flex h-[80px] flex-col items-center justify-center gap-0.5 rounded-sm border-2 border-blue-400 dark:border-blue-500 bg-blue-100 dark:bg-blue-950/40 text-center"
        >
          <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="8" y1="12" x2="8" y2="8"/>
            <line x1="16" y1="12" x2="16" y2="16"/>
            <polyline points="6,10 8,8 10,10"/>
            <polyline points="14,14 16,16 18,14"/>
          </svg>
          <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300">{t("liftLabel")}</span>
        </div>

        {/* ═══════ WC — decorative (1 col) - PURPLE ═══════ */}
        <div
          style={{ gridRow: G.rowB, gridColumn: ROW_B_LEFT + 2 }}
          className="flex h-[80px] flex-col items-center justify-center gap-0.5 rounded-sm border-2 border-purple-400 dark:border-purple-500 bg-purple-100 dark:bg-purple-950/40 text-center"
        >
          <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6h3v6H6z"/>
            <path d="M15 6h3v3h-3z"/>
            <path d="M15 12h3"/>
            <path d="M7.5 12v4"/>
            <path d="M16.5 9v7"/>
            <circle cx="7.5" cy="4" r="1.5"/>
            <circle cx="16.5" cy="4" r="1.5"/>
          </svg>
          <span className="text-[9px] font-bold text-purple-700 dark:text-purple-300">{t("wcLabel")}</span>
        </div>

        {/* ═══════ ROW B RIGHT — B-09 to B-14 ═══════ */}
        {rowBRight.map((s, idx) => {
          const isLastInRow = idx === rowBRight.length - 1;
          const isPillarPosition = (idx + 1) % 3 === 0 && !isLastInRow;
          return (
            <div 
              key={s.id} 
              style={{ gridRow: G.rowB, gridColumn: s.colIndex + 1 + LIFT_WC_COLS }}
            >
              <SlotBay 
                s={s} 
                onSlotPress={onSlotPress} 
                selected={selectedId === s.id}
                showPillar={isPillarPosition}
                showYellowLine={!isPillarPosition && !isLastInRow}
              />
            </div>
          );
        })}

        {/* ═══════ BOTTOM WALL ═══════ */}
        <div 
          style={{ gridRow: G.wallBottom, gridColumn: `1 / -1` }} 
          className="rounded-sm bg-zinc-400 dark:bg-zinc-600" 
        />
      </div>

      <div className="mt-3 border-t pt-2 text-center text-[11px] text-muted-foreground">
        {t("mapNote")}
      </div>
    </div>
  );
}

export function LegendRow() {
  const { t } = useI18n();
  const items = [
    { k: "AVAILABLE", label: t("available"), dot: "bg-emerald-400 dark:bg-emerald-500" },
    { k: "RESERVED", label: t("reserved"), dot: "bg-amber-400 dark:bg-amber-500" },
    { k: "OCCUPIED", label: t("occupied"), dot: "bg-red-400 dark:bg-red-500" },
    { k: "MAINTENANCE", label: t("maintenance"), dot: "bg-zinc-400 dark:bg-zinc-500" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-medium text-muted-foreground">
      {items.map((i) => (
        <span key={i.k} className="inline-flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-sm", i.dot)} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
