"use client";
/**
 * OperatorView — parking officer console: live slot monitor, active sessions,
 * today's revenue, per-slot maintenance control.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BadgeCheck,
  Banknote,
  CarFront,
  Clock3,
  LogIn,
  LogOut,
  Monitor,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useParkir } from "@/lib/store";
import {
  dateStr,
  rupiah,
  slotStatusForWindow,
  timeStr,
  tr,
  type Reservation,
  type Slot,
  type SlotStatus,
} from "@/lib/parking-data";
import { cn } from "@/lib/utils";

/** Window covering "right now" — operator always sees live state */
function nowWindow() {
  const d = new Date();
  const start = new Date(d.getTime() - 60_000);
  const end = new Date(d.getTime() + 60_000);
  return {
    date: dateStr(d),
    startTime: timeStr(start),
    endTime: timeStr(end),
  };
}

const TILE: Record<SlotStatus, { box: string; num: string }> = {
  AVAILABLE: {
    box: "border-emerald-400/30 bg-emerald-400/[0.07] hover:bg-emerald-400/[0.15]",
    num: "text-emerald-300",
  },
  RESERVED: {
    box: "border-amber-400/30 bg-amber-400/[0.06]",
    num: "text-amber-300",
  },
  OCCUPIED: {
    box: "border-red-400/30 bg-red-400/[0.07]",
    num: "text-red-300",
  },
  MAINTENANCE: {
    box: "border-slate-500/30 bg-slate-500/[0.08]",
    num: "text-slate-400",
  },
};

function useTicker(active: boolean): number {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [active]);
  return tick;
}

function fmtDuration(ms: number): string {
  const mins = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

export function OperatorView() {
  const lang = useParkir((s) => s.lang);
  const user = useParkir((s) => s.user);
  const slots = useParkir((s) => s.slots);
  const reservations = useParkir((s) => s.reservations);
  const transactions = useParkir((s) => s.transactions);
  const setSlotStatus = useParkir((s) => s.setSlotStatus);
  const signOut = useParkir((s) => s.signOut);
  const toast = useParkir((s) => s.toast);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const [detail, setDetail] = React.useState<Slot | null>(null);

  useTicker(true); // refresh durations every 30s
  const win = nowWindow();

  const stats = React.useMemo(() => {
    const c: Record<SlotStatus, number> = {
      AVAILABLE: 0,
      RESERVED: 0,
      OCCUPIED: 0,
      MAINTENANCE: 0,
    };
    slots.forEach((s) => c[slotStatusForWindow(s, reservations, win)]++);
    return c;
  }, [slots, reservations, win.date, win.startTime]);

  const activeSessions = React.useMemo(
    () =>
      reservations
        .filter((r) => r.status === "CHECKED_IN")
        .sort((a, b) => (b.checkedInAt ?? 0) - (a.checkedInAt ?? 0)),
    [reservations]
  );

  const todayStr = dateStr(new Date());
  const todayTxns = React.useMemo(() => {
    const dayStart = new Date(`${todayStr}T00:00:00`).getTime();
    return transactions.filter((tx) => tx.createdAt >= dayStart);
  }, [transactions, todayStr]);
  const revenue = React.useMemo(
    () =>
      todayTxns.reduce((sum, tx) => {
        if (tx.type === "TOP_UP" || tx.type === "REFUND") return sum;
        return sum + tx.amount;
      }, 0),
    [todayTxns]
  );

  const rowA = slots.filter((s) => s.rowLabel === "A");
  const rowB = slots.filter((s) => s.rowLabel === "B");

  function sessionOn(slot: Slot): Reservation | undefined {
    return reservations.find(
      (r) => r.slotId === slot.id && r.status === "CHECKED_IN"
    );
  }

  const statCards = [
    {
      label: t("inBuilding"),
      value: stats.OCCUPIED,
      cls: "border-red-400/25 bg-red-400/[0.06]",
      val: "text-red-300",
      icon: CarFront,
    },
    {
      label: t("reservedNow"),
      value: stats.RESERVED,
      cls: "border-amber-400/25 bg-amber-400/[0.06]",
      val: "text-amber-300",
      icon: Clock3,
    },
    {
      label: t("available"),
      value: stats.AVAILABLE,
      cls: "border-emerald-400/25 bg-emerald-400/[0.06]",
      val: "text-emerald-300",
      icon: LogIn,
    },
    {
      label: t("inMaintenance"),
      value: stats.MAINTENANCE,
      cls: "border-slate-500/25 bg-slate-500/[0.08]",
      val: "text-slate-300",
      icon: Wrench,
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── operator identity ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass glow-soft relative overflow-hidden rounded-3xl p-5"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-binus-bright/15 blur-3xl"
        />
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-binus-blue to-binus-bright">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-primary">
              <BadgeCheck className="h-3.5 w-3.5 text-primary-foreground" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-display text-lg font-bold leading-tight">{user.name}</p>
              <span className="shrink-0 rounded-full bg-binus-bright/15 px-2 py-0.5 text-[8px] font-black tracking-wider text-binus-bright">
                {t("operatorBadge")}
              </span>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">{t("operatorShift")}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              {t("operatorGreeting")}
            </p>
          </div>
        </div>

        {/* stats */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {statCards.map((s) => (
            <div key={s.label} className={cn("rounded-xl border p-2 text-center", s.cls)}>
              <s.icon className={cn("mx-auto h-3.5 w-3.5", s.val)} />
              <p className={cn("tnum mt-1 font-display text-lg font-bold leading-none", s.val)}>
                {s.value}
              </p>
              <p className="mt-1 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── revenue today ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="glass flex items-center gap-3.5 rounded-3xl p-4"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
          <Banknote className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {t("revenueToday")}
          </p>
          <p className="tnum font-display text-2xl font-bold text-gradient-gold">{rupiah(revenue)}</p>
        </div>
        <div className="shrink-0 rounded-xl border border-border bg-card/50 px-3 py-2 text-center">
          <p className="tnum font-display text-base font-bold">{todayTxns.length}</p>
          <p className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("txnsToday")}
          </p>
        </div>
      </motion.section>

      {/* ── live slot monitor ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass rounded-3xl p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
            <Monitor className="h-4 w-4 text-primary" />
            {t("liveMonitor")}
          </h3>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
            <Activity className="h-3 w-3" />
            {t("floorLabel").split("—")[0].trim()}
          </span>
        </div>

        {([
          { key: "A", list: rowA },
          { key: "B", list: rowB },
        ] as const).map(({ key, list }) => (
          <div key={key} className="mb-2 last:mb-0">
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
              {lang === "id" ? `Baris ${key}` : `Row ${key}`} · {list.length}
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {list.map((s) => {
                const st = slotStatusForWindow(s, reservations, win);
                const tile = TILE[st];
                return (
                  <button
                    key={s.id}
                    onClick={() => setDetail(s)}
                    className={cn(
                      "tnum relative flex h-11 items-center justify-center rounded-xl border font-display text-[11px] font-bold transition active:scale-90",
                      tile.box,
                      tile.num
                    )}
                  >
                    {s.slotNumber}
                    {st === "MAINTENANCE" && (
                      <Wrench className="absolute right-1 top-1 h-2.5 w-2.5 opacity-60" />
                    )}
                    {st === "OCCUPIED" && (
                      <CarFront className="absolute right-1 top-1 h-2.5 w-2.5 opacity-60" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <p className="mt-3 text-center text-[10px] text-muted-foreground/70">
          {lang === "id"
            ? "Ketuk slot untuk detail & kontrol perawatan"
            : "Tap a slot for details & maintenance control"}
        </p>
      </motion.section>

      {/* ── active sessions ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="glass rounded-3xl p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold tracking-tight">
            {t("activeSessionsTitle")}
          </h3>
          <span className="tnum rounded-full bg-red-400/15 px-2 py-0.5 text-[10px] font-black text-red-300">
            {activeSessions.length}
          </span>
        </div>
        <AnimatePresence initial={false}>
          {activeSessions.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {t("noActiveSessions")}
            </p>
          ) : (
            <div className="space-y-2">
              {activeSessions.map((r) => {
                const dur = fmtDuration(Date.now() - (r.checkedInAt ?? Date.now()));
                const late = Date.now() > new Date(`${r.date}T${r.endTime}:00`).getTime();
                return (
                  <motion.button
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    onClick={() => {
                      const slot = slots.find((s) => s.id === r.slotId);
                      if (slot) setDetail(slot);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.98]",
                      late
                        ? "border-red-400/30 bg-red-400/[0.06] hover:bg-red-400/[0.1]"
                        : "border-border bg-card/40 hover:bg-card/70"
                    )}
                  >
                    <span className="tnum flex h-10 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display text-sm font-bold text-primary">
                      {r.slotNumber}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold leading-tight">{r.driverName}</p>
                      <p className="tnum truncate text-[10.5px] text-muted-foreground">
                        {r.vehicleName} · {r.vehiclePlate}
                      </p>
                      <p className="tnum mt-0.5 text-[9.5px] text-muted-foreground/70">
                        {t("sinceLabel")} {r.checkedInAt ? timeStr(new Date(r.checkedInAt)) : "—"} ·{" "}
                        <span className={cn("font-bold", late ? "text-red-400" : "text-foreground/80")}>
                          {dur}
                        </span>
                        {late && (
                          <span className="ml-1 font-bold text-red-400">
                            · {lang === "id" ? "lewat jadwal" : "overdue"}
                          </span>
                        )}
                      </p>
                    </div>
                    <CarFront className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  </motion.button>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* ── sign out ── */}
      <button
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/25 bg-red-400/[0.06] py-3.5 text-sm font-bold text-red-400 transition hover:bg-red-400/10"
      >
        <LogOut className="h-4 w-4" />
        {t("signOut")}
      </button>

      {/* ── slot detail dialog ── */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-[380px] rounded-3xl border-border bg-card/95 p-5 backdrop-blur-xl">
          {detail && <SlotDetail slot={detail} onClose={() => setDetail(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );

  function SlotDetail({ slot, onClose }: { slot: Slot; onClose: () => void }) {
    const st = slotStatusForWindow(slot, reservations, nowWindow());
    const session = reservations.find(
      (r) => r.slotId === slot.id && r.status === "CHECKED_IN"
    );
    const booked = reservations.find(
      (r) => r.slotId === slot.id && r.status === "CONFIRMED"
    );
    const tile = TILE[st];

    function toggleMaintenance() {
      const next = slot.status === "MAINTENANCE" ? "ACTIVE" : "MAINTENANCE";
      setSlotStatus(slot.id, next);
      toast(
        next === "MAINTENANCE" ? t("maintenanceDone") : t("reactivated"),
        next === "MAINTENANCE" ? "info" : "success"
      );
      onClose();
    }

    const statusLabel: Record<SlotStatus, string> = {
      AVAILABLE: t("slotEmptyState"),
      RESERVED: t("reservedBy"),
      OCCUPIED: t("inBuilding"),
      MAINTENANCE: t("inMaintenance"),
    };

    return (
      <>
        <DialogHeader className="space-y-1.5">
          <div
            className={cn(
              "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border font-display text-xl font-bold",
              tile.box,
              tile.num
            )}
          >
            {slot.slotNumber}
          </div>
          <DialogTitle className="text-center font-display text-lg font-bold tracking-tight">
            {t("slotDetail")}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            {statusLabel[st]}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-2">
          {session ? (
            <>
              <DetailRow label={t("occupantLabel")} value={session.driverName} />
              <DetailRow label={t("vehicleLabel")} value={`${session.vehicleName} · ${session.vehiclePlate}`} />
              <DetailRow
                label={t("sinceLabel")}
                value={`${session.checkedInAt ? timeStr(new Date(session.checkedInAt)) : "—"} · ${fmtDuration(
                  Date.now() - (session.checkedInAt ?? Date.now())
                )}`}
              />
            </>
          ) : booked ? (
            <>
              <DetailRow label={t("occupantLabel")} value={booked.driverName} />
              <DetailRow label={t("vehicleLabel")} value={`${booked.vehicleName} · ${booked.vehiclePlate}`} />
              <DetailRow
                label={t("windowLabel")}
                value={`${fmtDate(booked.date, lang)} · ${booked.startTime}–${booked.endTime}`}
              />
            </>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-3 py-3">
              <LogIn className="h-4 w-4 shrink-0 text-emerald-400" />
              <p className="text-xs font-semibold text-emerald-300">{t("slotEmptyState")}</p>
            </div>
          )}
        </div>

        <button
          onClick={toggleMaintenance}
          className={cn(
            "mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold transition active:scale-[0.98]",
            slot.status === "MAINTENANCE"
              ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
              : "border border-slate-400/30 bg-slate-400/10 text-slate-300 hover:bg-slate-400/20"
          )}
        >
          <Wrench className="h-4 w-4" />
          {slot.status === "MAINTENANCE" ? t("backToService") : t("markMaintenance")}
        </button>

        <button
          onClick={onClose}
          className="mx-auto mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          {t("close")}
        </button>
      </>
    );
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="tnum min-w-0 truncate text-right text-xs font-bold">{value}</span>
    </div>
  );
}

function fmtDate(date: string, lang: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
  });
}
