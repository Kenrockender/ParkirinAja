"use client";
/**
 * Late-fine warning system.
 *
 * - `fineState()`  : pure helper - where a CHECKED_IN session stands relative to its end time.
 * - `FineAlertBar` : sticky bar shown on every tab while a session is ≤30 min from its end
 *                    (amber) or already overdue (red, with the running fine and when it grows).
 *
 * The staged notifications (30 / 15 / 5 min before, at the end, and each extra hour)
 * are raised by `useSessionAlerts` in NotifCenter.tsx using the same helper.
 */
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, ScanLine, TimerReset, TriangleAlert } from "lucide-react";
import { overtimeFee, rupiah, TARIFF, type Reservation } from "@/lib/parking-data";
import { useParkir } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Minutes before the end at which a warning is raised (largest first). */
export const WARN_STAGES = [30, 15, 5] as const;

export type FineState =
  | { phase: "ok"; minsLeft: number }
  | { phase: "soon"; minsLeft: number; stage: number }
  | { phase: "over"; lateMin: number; fine: number; nextFine: number; minsToNext: number; hour: number };

export function fineState(r: Pick<Reservation, "date" | "endTime">, now = Date.now()): FineState {
  const end = new Date(`${r.date}T${r.endTime}:00`).getTime();
  const diffMs = end - now;
  if (diffMs > 0) {
    const minsLeft = Math.ceil(diffMs / 60_000);
    // Smallest stage the session has already reached (30 → 15 → 5).
    const stage = [...WARN_STAGES].reverse().find((s) => minsLeft <= s);
    return stage ? { phase: "soon", minsLeft, stage } : { phase: "ok", minsLeft };
  }
  const lateMin = Math.max(1, Math.ceil(-diffMs / 60_000));
  const hour = Math.ceil(lateMin / 60);
  const fine = overtimeFee(lateMin);
  return {
    phase: "over",
    lateMin,
    fine,
    nextFine: fine + TARIFF.overtimeFeePerHour,
    minsToNext: hour * 60 - lateMin,
    hour,
  };
}

/** The signed-in customer's own active session that needs a warning, if any. */
function useWarnedSession() {
  const user = useParkir((s) => s.user);
  const reservations = useParkir((s) => s.reservations);
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  for (const r of reservations) {
    if (r.status !== "CHECKED_IN" || r.driverName !== user.name) continue;
    const st = fineState(r, now);
    if (st.phase !== "ok") return { res: r, st };
  }
  return null;
}

export function FineAlertBar({
  onOpenTicket,
  onCheckout,
}: {
  onOpenTicket: (reservationId: string) => void;
  onCheckout: () => void;
}) {
  const lang = useParkir((s) => s.lang);
  const extendSession = useParkir((s) => s.extendSession);
  const toast = useParkir((s) => s.toast);
  const hit = useWarnedSession();
  const id = lang === "id";

  return (
    <AnimatePresence initial={false}>
      {hit && (
        <motion.div
          key="fine-alert"
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          className="sticky top-[calc(0.5rem+env(safe-area-inset-top))] z-30 mb-3"
          data-fine-alert={hit.st.phase}
          role="alert"
        >
          {(() => {
            const { res, st } = hit;
            const over = st.phase === "over";
            const title = over
              ? id
                ? `Lewat ${st.lateMin} menit · denda ${rupiah(st.fine)}`
                : `${st.lateMin} min overdue · fine ${rupiah(st.fine)}`
              : id
                ? `Sisa ${st.phase === "soon" ? st.minsLeft : 0} menit parkir`
                : `${st.phase === "soon" ? st.minsLeft : 0} min of parking left`;
            const body = over
              ? id
                ? `Slot ${res.slotNumber}. Naik jadi ${rupiah(st.nextFine)} dalam ${st.minsToNext} menit. Segera scan keluar.`
                : `Slot ${res.slotNumber}. Rises to ${rupiah(st.nextFine)} in ${st.minsToNext} min. Scan out now.`
              : id
                ? `Slot ${res.slotNumber} selesai jam ${res.endTime}. Lewat dari itu kena denda ${rupiah(TARIFF.overtimeFeePerHour)}/jam.`
                : `Slot ${res.slotNumber} ends at ${res.endTime}. After that it's ${rupiah(TARIFF.overtimeFeePerHour)}/hour.`;

            return (
              <div
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-3.5 py-3 shadow-sm",
                  over
                    ? "border-red-500/50 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100"
                    : "border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                )}
              >
                <button
                  onClick={() => onOpenTicket(res.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  aria-label={id ? "Buka tiket" : "Open ticket"}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      over ? "bg-red-500/15" : "bg-amber-500/15"
                    )}
                  >
                    <TriangleAlert
                      className={cn("h-4.5 w-4.5", over ? "animate-pulse text-red-500" : "text-amber-500")}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="tnum block text-[12.5px] font-black leading-tight">{title}</span>
                    <span className="mt-0.5 block text-[10.5px] leading-snug opacity-80">{body}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                </button>

                {over ? (
                  <button
                    onClick={onCheckout}
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-red-500 px-3 text-[11px] font-black text-white transition hover:bg-red-600 active:scale-95"
                  >
                    <ScanLine className="h-3.5 w-3.5" />
                    {id ? "Keluar" : "Exit"}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const ok = extendSession(res.id, 1);
                      toast(
                        ok
                          ? id
                            ? "Waktu parkir diperpanjang 1 jam"
                            : "Parking extended by 1 hour"
                          : id
                            ? "Tidak bisa diperpanjang - slot sudah dipesan orang lain atau sudah jam tutup"
                            : "Cannot extend - slot is booked next or it's closing time",
                        ok ? "success" : "error"
                      );
                    }}
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-[11px] font-black text-primary-foreground transition hover:opacity-90 active:scale-95"
                  >
                    <TimerReset className="h-3.5 w-3.5" />
                    +1 {id ? "jam" : "h"}
                  </button>
                )}
              </div>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
