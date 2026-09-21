"use client";
/** Brand bits — logo mark, deterministic mock-QR, status pill. */
import React from "react";
import { cn } from "@/lib/utils";
import type { ResStatus, SlotStatus } from "@/lib/parking-data";
import { useParkir } from "@/lib/store";

export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <img
        src="/icons/icon-192x192.png"
        alt="Parkir Binus Logo"
        width={size}
        height={size}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

/** Deterministic pseudo-QR grid — pure module-level PRNG (xorshift). */
function buildQrGrid(seed: string): boolean[][] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
  const n = 21;
  const grid: boolean[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => rand() > 0.52)
  );
  const finder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 7; c++) {
        const edge = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[r0 + r][c0 + c] = edge || core;
      }
  };
  finder(0, 0);
  finder(0, n - 7);
  finder(n - 7, 0);
  return grid;
}

/** Deterministic pseudo-QR from a seed string — purely decorative. */
export function MockQR({ seed, size = 128, className }: { seed: string; size?: number; className?: string }) {
  const cells = React.useMemo(() => buildQrGrid(seed), [seed]);

  const n = 21;
  return (
    <div
      className={cn("grid gap-px rounded-lg bg-white p-2.5 shadow-lg", className)}
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, width: size, height: size }}
      aria-label="QR code (mock)"
      role="img"
    >
      {cells.flatMap((row, r) =>
        row.map((on, c) => (
          <span
            key={`${r}-${c}`}
            className={cn("aspect-square rounded-[0.5px]", on ? "bg-[#0b1226]" : "bg-white")}
          />
        ))
      )}
    </div>
  );
}

/** Status pill for reservations */
export function ResStatusPill({ status }: { status: ResStatus }) {
  const lang = useParkir((s) => s.lang);
  const labels: Record<ResStatus, string> = {
    CONFIRMED: lang === "id" ? "Terkonfirmasi" : "Confirmed",
    CHECKED_IN: lang === "id" ? "Sedang parkir" : "Parked",
    COMPLETED: lang === "id" ? "Selesai" : "Completed",
    CANCELLED: lang === "id" ? "Dibatalkan" : "Cancelled",
    NO_SHOW: lang === "id" ? "No-show" : "No-show",
    EXPIRED: lang === "id" ? "Kedaluwarsa" : "Expired",
  };
  const tone: Record<ResStatus, string> = {
    CONFIRMED: "bg-primary/15 text-primary border-primary/30",
    CHECKED_IN: "bg-emerald-400/15 text-emerald-600 dark:text-emerald-300 border-emerald-400/30",
    COMPLETED: "bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-400/20",
    CANCELLED: "bg-red-400/10 text-red-500 dark:text-red-400 border-red-400/25",
    NO_SHOW: "bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-400/25",
    EXPIRED: "bg-slate-400/10 text-slate-500 border-slate-400/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-5",
        tone[status]
      )}
    >
      {status === "CHECKED_IN" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
      )}
      {labels[status]}
    </span>
  );
}

/** Small glowing dot for map legend / cards */
export function SlotDot({ status }: { status: SlotStatus }) {
  const cls: Record<SlotStatus, string> = {
    AVAILABLE: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
    RESERVED: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]",
    OCCUPIED: "bg-red-400/80",
    MAINTENANCE: "bg-slate-500",
  };
  return <span className={cn("h-2 w-2 rounded-full", cls[status])} />;
}
