"use client";
/**
 * WayfindingView - animated SVG path from the campus entrance to the booked slot,
 * plus numbered step-by-step text directions.
 *
 * Supports all 3 campus layouts:
 *  · building  (Anggrek)     - entrance right side of Row A, lane, Row B bottom
 *  · openlot   (Alam Sutera / Bekasi) - MASUK gate left side, KELUAR right side
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { campusById, campusForSlot, tr } from "@/lib/parking-data";
import { useParkir } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Reservation } from "@/lib/parking-data";

// ─── SVG canvas dimensions ───────────────────────────────────────────────────
const SVG_W = 340;
const SVG_H = 180;

// layout zones (Y)
const ROW_A_Y   = 32;   // centre of Row A strip
const LANE_Y    = 90;   // centre of drive lane
const ROW_B_Y   = 148;  // centre of Row B strip
const ROW_H     = 36;   // height of each row strip
const LANE_H    = 28;   // height of lane strip

// layout zones (X)
const LEFT_GATE_X  = 28;   // MASUK gate centre (openlot)
const RIGHT_GATE_X = SVG_W - 28; // KELUAR / Anggrek entrance centre
const SLOT_STEP    = 8;    // pixels per slot column index (scaled to fit SVG)
const ROW_A_START_X = 32;  // X of col-0 for Row A
const ROW_B_START_X = 32;  // X of col-0 for Row B

/** Map a slot's colIndex → SVG X, clamped so it stays inside the canvas. */
function slotX(colIndex: number): number {
  return Math.min(ROW_A_START_X + colIndex * SLOT_STEP, SVG_W - 20);
}

// ─── Path computation ─────────────────────────────────────────────────────────

interface Waypoint { x: number; y: number }

function computePath(
  row: "A" | "B",
  colIndex: number,
  layout: "building" | "openlot"
): Waypoint[] {
  const destX = slotX(colIndex);
  const destY = row === "A" ? ROW_A_Y : ROW_B_Y;

  if (layout === "openlot") {
    // MASUK gate (left) → drive lane → turn into correct row
    if (row === "A") {
      // Enter left → go right along lane → turn up into Row A
      return [
        { x: LEFT_GATE_X, y: LANE_Y },
        { x: destX,       y: LANE_Y },
        { x: destX,       y: destY  },
      ];
    } else {
      // Enter left → go right along lane → turn down into Row B
      return [
        { x: LEFT_GATE_X, y: LANE_Y },
        { x: destX,       y: LANE_Y },
        { x: destX,       y: destY  },
      ];
    }
  } else {
    // Building (Anggrek): entrance is on the RIGHT side of Row A
    if (row === "A") {
      // Enter right → travel left along Row A to slot
      return [
        { x: RIGHT_GATE_X, y: ROW_A_Y },
        { x: destX,        y: ROW_A_Y },
      ];
    } else {
      // Enter right → travel left along Row A → go down through lane → Row B
      return [
        { x: RIGHT_GATE_X, y: ROW_A_Y },
        { x: destX,        y: ROW_A_Y },
        { x: destX,        y: LANE_Y  },
        { x: destX,        y: destY   },
      ];
    }
  }
}

/** Convert waypoints → SVG polyline `points` attribute. */
function pointsAttr(pts: Waypoint[]): string {
  return pts.map((p) => `${p.x},${p.y}`).join(" ");
}

/** Total length of a polyline (for stroke-dasharray animation). */
function pathLength(pts: Waypoint[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return Math.ceil(len);
}

// ─── Text directions ──────────────────────────────────────────────────────────

function buildSteps(
  row: "A" | "B",
  colIndex: number,
  slotNumber: string,
  layout: "building" | "openlot",
  lang: "id" | "en"
): string[] {
  const id = lang === "id";
  const bayNum = colIndex + 1;
  const side = colIndex < 3
    ? (id ? "kiri (dekat pintu masuk)" : "left (near entrance)")
    : colIndex > (layout === "building" ? 14 : 16)
    ? (id ? "kanan" : "right")
    : (id ? "tengah" : "middle");

  if (layout === "openlot") {
    if (row === "A") {
      return [
        id ? "Masuk dari gerbang MASUK di sisi kiri area parkir." : "Enter through the MASUK gate on the left side of the parking area.",
        id ? "Ikuti jalur utama ke kanan." : "Follow the main drive lane to the right.",
        id ? `Belok ke Baris A (baris atas).` : `Turn into Row A (top row).`,
        id ? `Slot ${slotNumber} ada di sisi ${side}, baris ke-${bayNum}.` : `Slot ${slotNumber} is on the ${side} side, bay ${bayNum}.`,
      ];
    } else {
      return [
        id ? "Masuk dari gerbang MASUK di sisi kiri area parkir." : "Enter through the MASUK gate on the left side of the parking area.",
        id ? "Ikuti jalur utama ke kanan." : "Follow the main drive lane to the right.",
        id ? `Belok ke Baris B (baris bawah).` : `Turn into Row B (bottom row).`,
        id ? `Slot ${slotNumber} ada di sisi ${side}, baris ke-${bayNum}.` : `Slot ${slotNumber} is on the ${side} side, bay ${bayNum}.`,
      ];
    }
  } else {
    // Building (Anggrek)
    if (row === "A") {
      return [
        id ? "Masuk dari gerbang MASUK di sisi kanan atas gedung parkir." : "Enter through the MASUK gate on the upper-right of the parking building.",
        id ? `Berjalan ke kiri di sepanjang Baris A.` : `Walk left along Row A.`,
        id ? `Slot ${slotNumber} ada di sisi ${side}, baris ke-${bayNum}.` : `Slot ${slotNumber} is on the ${side} side, bay ${bayNum}.`,
      ];
    } else {
      return [
        id ? "Masuk dari gerbang MASUK di sisi kanan atas gedung parkir." : "Enter through the MASUK gate on the upper-right of the parking building.",
        id ? "Ikuti jalur hingga menemukan nomor kolom yang sesuai." : "Follow the lane until you reach the matching column number.",
        id ? `Belok ke Baris B (baris bawah).` : `Turn into Row B (bottom row).`,
        id ? `Slot ${slotNumber} ada di sisi ${side}, baris ke-${bayNum}.` : `Slot ${slotNumber} is on the ${side} side, bay ${bayNum}.`,
      ];
    }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WayfindingView({
  open,
  onClose,
  reservation,
}: {
  open: boolean;
  onClose: () => void;
  reservation: Reservation;
}) {
  const lang = useParkir((s) => s.lang);
  const slots = useParkir((s) => s.slots);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);

  const campusId = campusForSlot(reservation.slotId);
  const campus = campusById(campusId);
  const layout = campus.layout ?? "building";

  const slot = slots.find((s) => s.id === reservation.slotId);
  const row = slot?.rowLabel ?? (reservation.slotNumber.startsWith("A") ? "A" : "B");
  const colIndex = slot?.colIndex ?? 0;

  const waypoints = React.useMemo(
    () => computePath(row, colIndex, layout as "building" | "openlot"),
    [row, colIndex, layout]
  );

  const totalLen = React.useMemo(() => pathLength(waypoints), [waypoints]);
  const dest = waypoints[waypoints.length - 1];

  const steps = React.useMemo(
    () => buildSteps(row, colIndex, reservation.slotNumber, layout as "building" | "openlot", lang),
    [row, colIndex, reservation.slotNumber, layout, lang]
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[390px] rounded-3xl border-border bg-card/95 p-5 backdrop-blur-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 font-display text-base font-bold tracking-tight">
            <Navigation className="h-4.5 w-4.5 text-primary" />
            {t("wayfindTitle")}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground">
            {campus.location} · {t("wayfindSub")}
          </DialogDescription>
        </DialogHeader>

        {/* ── animated SVG map ── */}
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-white dark:bg-[#0F172A]/80">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            width="100%"
            aria-label={`Route to slot ${reservation.slotNumber}`}
          >
            {/* background */}
            <rect width={SVG_W} height={SVG_H} fill="transparent" />

            {/* Row A strip */}
            <rect
              x={0} y={ROW_A_Y - ROW_H / 2}
              width={SVG_W} height={ROW_H}
              rx={6}
              className="fill-slate-100 dark:fill-white/[0.04]"
            />
            <text x={8} y={ROW_A_Y + 4} fontSize={7} fontWeight={700}
              className="fill-slate-400 dark:fill-white/40"
            >ROW A</text>

            {/* Lane strip */}
            <rect
              x={0} y={LANE_Y - LANE_H / 2}
              width={SVG_W} height={LANE_H}
              className="fill-slate-50 dark:fill-white/[0.02]"
            />
            <line
              x1={0} y1={LANE_Y} x2={SVG_W} y2={LANE_Y}
              strokeWidth={1.5} strokeDasharray="6 4"
              className="stroke-slate-300 dark:stroke-white/10"
            />
            <text x={SVG_W / 2 - 22} y={LANE_Y + 4} fontSize={6.5} fontWeight={700}
              letterSpacing={1.5}
              className="fill-slate-400 dark:fill-white/30"
            >
              {lang === "id" ? "JALUR MOBIL" : "DRIVE LANE"}
            </text>

            {/* Row B strip */}
            <rect
              x={0} y={ROW_B_Y - ROW_H / 2}
              width={SVG_W} height={ROW_H}
              rx={6}
              className="fill-slate-100 dark:fill-white/[0.04]"
            />
            <text x={8} y={ROW_B_Y + 4} fontSize={7} fontWeight={700}
              className="fill-slate-400 dark:fill-white/40"
            >ROW B</text>

            {/* Gate markers */}
            {layout === "openlot" ? (
              <>
                {/* MASUK - left */}
                <rect x={2} y={LANE_Y - 13} width={22} height={26} rx={5}
                  className="fill-green-100 stroke-green-400 dark:fill-green-400/10"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                />
                <text x={13} y={LANE_Y - 2} fontSize={5.5} fontWeight={800} textAnchor="middle"
                  className="fill-green-700 dark:fill-green-300"
                >MASUK</text>
                <text x={13} y={LANE_Y + 6} fontSize={5} textAnchor="middle"
                  className="fill-green-600 dark:fill-green-400"
                >▶</text>

                {/* KELUAR - right */}
                <rect x={SVG_W - 24} y={LANE_Y - 13} width={22} height={26} rx={5}
                  className="fill-slate-100 stroke-slate-400 dark:fill-white/5"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                />
                <text x={SVG_W - 13} y={LANE_Y + 3} fontSize={5} fontWeight={800} textAnchor="middle"
                  className="fill-slate-500 dark:fill-white/40"
                >KELUAR</text>
              </>
            ) : (
              /* Building entrance - right side of Row A */
              <>
                <rect x={SVG_W - 24} y={ROW_A_Y - 13} width={22} height={26} rx={5}
                  className="fill-green-100 stroke-green-400 dark:fill-green-400/10"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                />
                <text x={SVG_W - 13} y={ROW_A_Y - 1} fontSize={5} fontWeight={800} textAnchor="middle"
                  className="fill-green-700 dark:fill-green-300"
                >MASUK</text>
                <text x={SVG_W - 13} y={ROW_A_Y + 7} fontSize={5} textAnchor="middle"
                  className="fill-green-600 dark:fill-green-400"
                >◀</text>
              </>
            )}

            {/* Animated route path */}
            <motion.polyline
              points={pointsAttr(waypoints)}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={totalLen}
              initial={{ strokeDashoffset: totalLen }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.2, ease: "easeInOut", delay: 0.2 }}
            />

            {/* Start dot (entrance) */}
            <circle
              cx={waypoints[0].x} cy={waypoints[0].y}
              r={4}
              className="fill-green-400"
            />

            {/* Destination - pulsing ring + filled dot */}
            <motion.circle
              cx={dest.x} cy={dest.y} r={9}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={1.5}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.6, 0.8] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
            />
            <motion.circle
              cx={dest.x} cy={dest.y} r={5}
              fill="#3B82F6"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 1.3 }}
            />

            {/* Slot label */}
            <motion.g
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.3 }}
            >
              <rect
                x={dest.x - 16} y={dest.y - (row === "A" ? 24 : -12)}
                width={32} height={14} rx={4}
                fill="#3B82F6"
              />
              <text
                x={dest.x} y={dest.y - (row === "A" ? 13 : 23)}
                fontSize={7.5} fontWeight={800} textAnchor="middle"
                fill="#ffffff"
              >
                {reservation.slotNumber}
              </text>
            </motion.g>
          </svg>
        </div>

        {/* ── step-by-step directions ── */}
        <div className="mt-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
            {t("wayfindSteps")}
          </p>
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 * i + 0.3, duration: 0.25 }}
              className="flex items-start gap-3"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground">
                {i + 1}
              </span>
              <p className="text-[12px] leading-snug">{step}</p>
            </motion.div>
          ))}
        </div>

        {/* destination chip */}
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-primary/25 bg-primary/[0.07] px-3.5 py-2.5">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-muted-foreground">{t("wayfindDest")}</p>
            <p className="tnum font-display text-sm font-bold text-primary">{reservation.slotNumber}</p>
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">{campus.name}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
