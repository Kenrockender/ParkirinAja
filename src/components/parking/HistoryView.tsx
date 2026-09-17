"use client";
/** HistoryView — reservation timeline with filters & 10-min full-refund countdown. */
import React from "react";
import { motion } from "framer-motion";
import { ChevronRight, Clock3, History as HistoryIcon, Timer, Zap } from "lucide-react";
import { ResStatusPill } from "./Brand";
import { useParkir } from "@/lib/store";
import { campusForSlot, rupiah, tr, TARIFF } from "@/lib/parking-data";
import { cn } from "@/lib/utils";

type Filter = "all" | "upcoming" | "active" | "done";

export function HistoryView({ onOpen }: { onOpen: (id: string) => void }) {
  const lang = useParkir((s) => s.lang);
  const user = useParkir((s) => s.user);
  const allReservations = useParkir((s) => s.reservations);
  // Only the signed-in user's own sessions — other parkers' live sessions stay out.
  const reservations = React.useMemo(
    () => allReservations.filter((r) => r.driverName === user.name),
    [allReservations, user.name]
  );
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [, tick] = React.useReducer((x: number) => x + 1, 0);

  // countdown ticker
  React.useEffect(() => {
    const hasCountdown = reservations.some(
      (r) => r.status === "CONFIRMED" && Date.now() - r.createdAt < TARIFF.fullRefundWindowMs
    );
    if (!hasCountdown) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [reservations]);

  const filtered = reservations.filter((r) => {
    if (filter === "upcoming") return r.status === "CONFIRMED";
    if (filter === "active") return r.status === "CHECKED_IN";
    if (filter === "done")
      return ["COMPLETED", "CANCELLED", "NO_SHOW", "EXPIRED"].includes(r.status);
    return true;
  });

  const filters: { k: Filter; label: string }[] = [
    { k: "all", label: t("filterAll") },
    { k: "upcoming", label: t("filterUpcoming") },
    { k: "active", label: t("filterActive") },
    { k: "done", label: t("filterDone") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold tracking-tight">{t("historyTitle")}</h2>
        <span className="tnum rounded-full border border-border bg-card/60 px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
          {reservations.length}
        </span>
      </div>

      {/* filters */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {filters.map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all",
              filter === f.k
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-card/50 text-muted-foreground hover:border-primary/25 hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* list */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass flex flex-col items-center rounded-3xl px-6 py-14 text-center"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
            <HistoryIcon className="h-6 w-6 text-muted-foreground/60" />
          </span>
          <p className="mt-4 text-sm font-bold">{t("emptyHistory")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("emptyHistorySub")}</p>
        </motion.div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((r, i) => {
            const now = Date.now();
            const countdownMs =
              r.status === "CONFIRMED"
                ? TARIFF.fullRefundWindowMs - (now - r.createdAt)
                : -1;
            const showCountdown = countdownMs > 0;
            const mm = Math.max(0, Math.floor(countdownMs / 60000));
            const ss = Math.max(0, Math.floor((countdownMs % 60000) / 1000));
            const dateFmt = new Date(`${r.date}T00:00:00`).toLocaleDateString(
              lang === "id" ? "id-ID" : "en-US",
              { weekday: "short", day: "numeric", month: "short" }
            );
            return (
              <motion.button
                key={r.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                onClick={() => onOpen(r.id)}
                className="glass lift group block w-full rounded-2xl p-3.5 text-left"
              >
                {/* refund countdown */}
                {showCountdown && (
                  <div className="mb-2.5 flex items-center justify-between rounded-xl border border-primary/25 bg-primary/[0.08] px-3 py-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary">
                      <Zap className="h-3 w-3" />
                      {t("fullRefundEnds")}
                    </span>
                    <span className="tnum font-display text-sm font-bold tabular-nums text-primary">
                      {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3.5">
                  {/* slot block */}
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                    <span className="tnum font-display text-sm font-bold leading-none text-gradient-gold">
                      {r.slotNumber}
                    </span>
                    <span className="mt-1 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {r.type === "WALK_IN" ? "walk-in" : "advance"}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="tnum text-[13px] font-bold">{r.code}</p>
                      <ResStatusPill status={r.status} />
                    </div>
                    <p className="tnum mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      {dateFmt} · {r.startTime}–{r.endTime}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="tnum text-[13px] font-bold">
                      {r.status === "CANCELLED" && r.refundAmount
                        ? `+${rupiah(r.refundAmount)}`
                        : rupiah(r.serviceFee)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>

                {r.status === "CHECKED_IN" && (
                  <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-emerald-400/[0.07] px-2.5 py-1.5 text-[10px] font-semibold text-emerald-300">
                    <Timer className="h-3 w-3" />
                    {t("sessionActive")} · {r.slotNumber} · {LOCATION_SHORT(r.slotId)}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LOCATION_SHORT(slotId: string): string {
  const campus = campusForSlot(slotId);
  if (campus === "alamsutera") return "Alam Sutera";
  if (campus === "bekasi") return "Bekasi";
  return "Anggrek L1";
}
