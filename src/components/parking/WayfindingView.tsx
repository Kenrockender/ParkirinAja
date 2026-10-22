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
import { motion } from "framer-motion";
import { MapPin, Navigation } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { campusById, campusForSlot, slotStatusForWindow, tr } from "@/lib/parking-data";
import { useParkir } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Reservation } from "@/lib/parking-data";

// ─── SVG canvas dimensions ───────────────────────────────────────────────────
const SVG_W = 340;
const SVG_H = 198;

// layout zones (Y)
const ROW_A_Y   = 40;   // centre of top parking bays
const LANE_Y    = 100;  // centre of the drive lane
const ROW_B_Y   = 160;  // centre of bottom parking bays
const ROW_H     = 38;   // height of each row strip
const LANE_H    = 34;   // height of lane strip

// layout zones (X)
const LEFT_GATE_X  = 19;   // MASUK gate centre (open lot)
const RIGHT_GATE_X = SVG_W - 19; // MASUK gate centre (Anggrek building)
const BAYS_LEFT_X  = 30;
const BAYS_WIDTH   = SVG_W - 60;

/** Centre x-coordinate for a real bay in a rendered parking row. */
function bayX(colIndex: number, rowCount: number): number {
  const count = Math.max(rowCount, 1);
  return BAYS_LEFT_X + ((colIndex + 0.5) * BAYS_WIDTH) / count;
}

function bayWidth(rowCount: number): number {
  return Math.max(7, BAYS_WIDTH / Math.max(rowCount, 1) - 2.4);
}

/** Keep the route map legible by showing a window around the reservation. */
function visibleBayWindow<T extends { colIndex: number }>(bays: T[], focusColIndex: number, size = 9): T[] {
  if (bays.length <= size) return bays;
  const focusIndex = Math.max(0, bays.findIndex((bay) => bay.colIndex === focusColIndex));
  const start = Math.min(Math.max(0, focusIndex - Math.floor(size / 2)), bays.length - size);
  return bays.slice(start, start + size);
}

// ─── Path computation ─────────────────────────────────────────────────────────

interface Waypoint { x: number; y: number }

function TopDownCar({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-label="Mobil terparkir">
      <rect x={-8} y={-17} width={16} height={34} rx={5} fill="#0B1220" opacity={0.45} transform="translate(1 2)" />
      <rect x={-8} y={-17} width={16} height={34} rx={5} fill={color} stroke="#E2E8F0" strokeWidth={0.8} />
      <rect x={-5.6} y={-10.5} width={11.2} height={14} rx={2.8} fill="#172033" stroke="#94A3B8" strokeWidth={0.6} />
      <path d="M-5.2 -3.5H5.2M0 -10.2V3.2" stroke="#CBD5E1" strokeWidth={0.55} opacity={0.85} />
      <path d="M-5 -14H5M-5 14H5" stroke="#F8FAFC" strokeWidth={1.25} strokeLinecap="round" opacity={0.88} />
      <rect x={-10} y={-11} width={2.7} height={7} rx={1.2} fill="#111827" />
      <rect x={7.3} y={-11} width={2.7} height={7} rx={1.2} fill="#111827" />
      <rect x={-10} y={4} width={2.7} height={7} rx={1.2} fill="#111827" />
      <rect x={7.3} y={4} width={2.7} height={7} rx={1.2} fill="#111827" />
    </g>
  );
}

function computePath(destX: number, destY: number, layout: "building" | "openlot"): Waypoint[] {
  const entranceX = layout === "building" ? RIGHT_GATE_X : LEFT_GATE_X;
  return [
    { x: entranceX, y: LANE_Y },
    { x: destX, y: LANE_Y },
    { x: destX, y: destY },
  ];
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
  const reservations = useParkir((s) => s.reservations);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);

  const campusId = campusForSlot(reservation.slotId);
  const campus = campusById(campusId);
  const layout = campus.layout ?? "building";

  const slot = slots.find((s) => s.id === reservation.slotId);
  const row = slot?.rowLabel ?? (reservation.slotNumber.startsWith("A") ? "A" : "B");
  const colIndex = slot?.colIndex ?? 0;
  const campusSlots = React.useMemo(
    () => slots.filter((parkingSlot) => campusForSlot(parkingSlot.id) === campusId),
    [slots, campusId]
  );
  const rowASlots = React.useMemo(
    () => campusSlots.filter((parkingSlot) => parkingSlot.rowLabel === "A").sort((a, b) => a.colIndex - b.colIndex),
    [campusSlots]
  );
  const rowBSlots = React.useMemo(
    () => campusSlots.filter((parkingSlot) => parkingSlot.rowLabel === "B").sort((a, b) => a.colIndex - b.colIndex),
    [campusSlots]
  );
  const occupiedSlotIds = React.useMemo(() => {
    const window = { date: reservation.date, startTime: reservation.startTime, endTime: reservation.endTime };
    return new Set(
      campusSlots
        .filter((parkingSlot) => slotStatusForWindow(parkingSlot, reservations, window) === "OCCUPIED")
        .map((parkingSlot) => parkingSlot.id)
    );
  }, [campusSlots, reservations, reservation.date, reservation.startTime, reservation.endTime]);
  const visibleRowASlots = React.useMemo(() => visibleBayWindow(rowASlots, colIndex), [rowASlots, colIndex]);
  const visibleRowBSlots = React.useMemo(() => visibleBayWindow(rowBSlots, colIndex), [rowBSlots, colIndex]);
  const visibleDestinationSlots = row === "A" ? visibleRowASlots : visibleRowBSlots;
  const destinationVisibleIndex = Math.max(0, visibleDestinationSlots.findIndex((parkingSlot) => parkingSlot.id === reservation.slotId));
  const destinationX = bayX(destinationVisibleIndex, visibleDestinationSlots.length);
  const destinationY = row === "A" ? ROW_A_Y : ROW_B_Y;

  const waypoints = React.useMemo(
    () => computePath(destinationX, destinationY, layout as "building" | "openlot"),
    [destinationX, destinationY, layout]
  );

  const totalLen = React.useMemo(() => pathLength(waypoints), [waypoints]);
  const dest = waypoints[waypoints.length - 1];
  const carTimes = React.useMemo(() => {
    const travelled = [0];
    for (let i = 1; i < waypoints.length; i++) {
      const dx = waypoints[i].x - waypoints[i - 1].x;
      const dy = waypoints[i].y - waypoints[i - 1].y;
      travelled.push(travelled[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    const total = travelled[travelled.length - 1] || 1;
    return travelled.map((distance) => distance / total);
  }, [waypoints]);
  const carFacesLeft = layout === "building";

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
            <defs>
              <pattern id="parking-asphalt" width="8" height="8" patternUnits="userSpaceOnUse">
                <rect width="8" height="8" fill="#27323A" />
                <circle cx="1.5" cy="2" r="0.45" fill="#94A3B8" opacity="0.22" />
                <circle cx="6" cy="5.5" r="0.35" fill="#020617" opacity="0.3" />
              </pattern>
            </defs>
            <rect width={SVG_W} height={SVG_H} fill="url(#parking-asphalt)" />

            {/* Top-down parking bays — paint lines sit directly on the asphalt. */}
            <rect
              x={0} y={ROW_A_Y - ROW_H / 2}
              width={SVG_W} height={ROW_H}
              fill="#111827"
              opacity={0.28}
            />
            <text x={8} y={14} fontSize={6.3} fontWeight={800} letterSpacing={1.1} fill="#CBD5E1">BARIS A</text>
            {visibleRowASlots.map((parkingSlot, visibleIndex) => {
              const x = bayX(visibleIndex, visibleRowASlots.length);
              const w = bayWidth(visibleRowASlots.length);
              const isDestination = parkingSlot.id === reservation.slotId;
              const isOccupied = occupiedSlotIds.has(parkingSlot.id);
              return (
                <motion.g
                  key={parkingSlot.id}
                  initial={{ opacity: 0, scale: 0.82 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * visibleIndex, duration: 0.2 }}
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                >
                  <rect
                    x={x - w / 2} y={ROW_A_Y - 18} width={w} height={36}
                    fill={isDestination ? "rgba(37,99,235,0.32)" : "rgba(15,23,42,0.15)"}
                    stroke={isDestination ? "#60A5FA" : "#E2E8F0"}
                    strokeOpacity={isDestination ? 1 : 0.74}
                    strokeWidth={isDestination ? 1.7 : 1.2}
                  />
                  {/* The selected bay is intentionally empty until the guide car arrives. */}
                  {isOccupied && !isDestination && <TopDownCar x={x} y={ROW_A_Y} color={["#EF4444", "#EAB308", "#94A3B8", "#14B8A6"][parkingSlot.colIndex % 4]} />}
                  <text x={x} y={ROW_A_Y + 15} fontSize={w < 18 ? 4.8 : 5.8} fontWeight={800} textAnchor="middle" fill={isDestination ? "#DBEAFE" : "#CBD5E1"}>
                    {parkingSlot.colIndex + 1}
                  </text>
                </motion.g>
              );
            })}

            {/* Lane strip */}
            <rect
              x={0} y={LANE_Y - LANE_H / 2}
              width={SVG_W} height={LANE_H}
              fill="#334155"
              opacity={0.62}
            />
            <line
              x1={0} y1={LANE_Y} x2={SVG_W} y2={LANE_Y}
              strokeWidth={1.5} strokeDasharray="6 4"
              stroke="#E2E8F0"
              opacity={0.34}
            />
            <text x={SVG_W / 2 - 31} y={LANE_Y + 13} fontSize={5.5} fontWeight={800}
              letterSpacing={1.5}
              fill="#CBD5E1"
              opacity={0.58}
            >
              {lang === "id" ? "JALUR KENDARAAN" : "DRIVE LANE"}
            </text>

            {/* Row B strip */}
            <rect
              x={0} y={ROW_B_Y - ROW_H / 2}
              width={SVG_W} height={ROW_H}
              fill="#111827"
              opacity={0.28}
            />
            <text x={8} y={ROW_B_Y - 27} fontSize={6.3} fontWeight={800} letterSpacing={1.1} fill="#CBD5E1">BARIS B</text>
            {visibleRowBSlots.map((parkingSlot, visibleIndex) => {
              const x = bayX(visibleIndex, visibleRowBSlots.length);
              const w = bayWidth(visibleRowBSlots.length);
              const isDestination = parkingSlot.id === reservation.slotId;
              const isOccupied = occupiedSlotIds.has(parkingSlot.id);
              return (
                <motion.g
                  key={parkingSlot.id}
                  initial={{ opacity: 0, scale: 0.82 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * visibleIndex, duration: 0.2 }}
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                >
                  <rect
                    x={x - w / 2} y={ROW_B_Y - 18} width={w} height={36}
                    fill={isDestination ? "rgba(37,99,235,0.32)" : "rgba(15,23,42,0.15)"}
                    stroke={isDestination ? "#60A5FA" : "#E2E8F0"}
                    strokeOpacity={isDestination ? 1 : 0.74}
                    strokeWidth={isDestination ? 1.7 : 1.2}
                  />
                  {/* The selected bay is intentionally empty until the guide car arrives. */}
                  {isOccupied && !isDestination && <TopDownCar x={x} y={ROW_B_Y} color={["#EF4444", "#EAB308", "#94A3B8", "#14B8A6"][parkingSlot.colIndex % 4]} />}
                  <text x={x} y={ROW_B_Y + 15} fontSize={w < 18 ? 4.8 : 5.8} fontWeight={800} textAnchor="middle" fill={isDestination ? "#DBEAFE" : "#CBD5E1"}>
                    {parkingSlot.colIndex + 1}
                  </text>
                </motion.g>
              );
            })}

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
                <rect x={SVG_W - 24} y={LANE_Y - 13} width={22} height={26} rx={5}
                  className="fill-green-100 stroke-green-400 dark:fill-green-400/10"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                />
                <text x={SVG_W - 13} y={LANE_Y - 1} fontSize={5} fontWeight={800} textAnchor="middle"
                  className="fill-green-700 dark:fill-green-300"
                >MASUK</text>
                <text x={SVG_W - 13} y={LANE_Y + 7} fontSize={5} textAnchor="middle"
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
              transition={{ duration: 1.65, ease: "linear", delay: 0.2 }}
            />

            {/* The ParkirinAja mascot drives from the entrance to the reserved slot. */}
            <motion.image
              href="/mascot/processed/car-side-wave-transparent.png"
              x={-33}
              y={-21}
              width={66}
              height={42}
              preserveAspectRatio="xMidYMid meet"
              initial={{ opacity: 0, x: waypoints[0].x, y: waypoints[0].y, scaleX: carFacesLeft ? -1 : 1, scaleY: 1 }}
              animate={{
                opacity: [0, 1, 1, 0],
                x: waypoints.map((point) => point.x),
                y: waypoints.map((point) => point.y),
                scaleX: carFacesLeft ? -1 : 1,
                scaleY: 1,
              }}
              transition={{
                opacity: { duration: 1.85, delay: 0.2, ease: "linear", times: [0, 0.04, 0.88, 1] },
                x: { duration: 1.65, delay: 0.2, ease: "linear", times: carTimes },
                y: { duration: 1.65, delay: 0.2, ease: "linear", times: carTimes },
              }}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />

            {/* Destination confirms only after the mascot reaches the bay. */}
            <motion.circle
              cx={dest.x} cy={dest.y} r={14}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={1.5}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.6, 0.8] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 1.78 }}
            />
            <motion.g
              initial={{ opacity: 0, scale: 0.72 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.24, delay: 1.82, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            >
              <TopDownCar x={dest.x} y={dest.y} color="#3B82F6" />
            </motion.g>

            {/* Slot label */}
            <motion.g
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.08, duration: 0.3 }}
            >
              <rect
                x={dest.x - 16} y={dest.y - (row === "A" ? 38 : -22)}
                width={32} height={14} rx={4}
                fill="#3B82F6"
              />
              <text
                x={dest.x} y={dest.y - (row === "A" ? 27 : 33)}
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
