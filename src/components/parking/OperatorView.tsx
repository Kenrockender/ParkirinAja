"use client";
/**
 * OperatorView — parking officer command center.
 * Live slot monitor, occupancy & revenue analytics, peak-hours chart, live
 * activity feed, session control (force check-out / extend / manual check-in),
 * reservation management, slot QR codes and a daily recap — in 3 tabs.
 */
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import {
  Activity,
  BadgeCheck,
  Banknote,
  BarChart3,
  CalendarPlus,
  Car,
  CarFront,
  ClipboardList,
  Clock3,
  Download,
  Gauge,
  History as HistoryIcon,
  LogIn,
  LogOut,
  Monitor,
  Plus,
  Printer,
  QrCode,
  Search,
  ShieldCheck,
  Timer,
  TimerReset,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResStatusPill } from "./Brand";
import { useParkir } from "@/lib/store";
import {
  campusById,
  campusCodePrefix,
  campusForSlot,
  dateStr,
  demandNow,
  DEMAND_TIERS,
  rupiah,
  slotStatusForWindow,
  TARIFF,
  timeStr,
  tr,
  type DemandInfo,
  type Reservation,
  type Slot,
  type SlotStatus,
  type Txn,
} from "@/lib/parking-data";
import { cn } from "@/lib/utils";

// ───────────────────────── module helpers ─────────────────────────

const WEEK_MS = 7 * 24 * 3600_000;
const DAY_START_H = 6;
const DAY_END_H = 23;

type OpTab = "monitor" | "qr" | "history";

/** Window covering "right now" — operator always sees live state */
function nowWindow() {
  const d = new Date();
  return {
    date: dateStr(d),
    startTime: timeStr(new Date(d.getTime() - 60_000)),
    endTime: timeStr(new Date(d.getTime() + 60_000)),
  };
}

/** Payload encoded in every physical slot QR — parseable by the customer scanner. */
export function slotQrPayload(slot: Slot): string {
  return `${campusCodePrefix(campusForSlot(slot.id))}-${slot.slotNumber}`;
}

/** Campus-aware location line for QR cards & the print sheet. */
export function slotLocation(slot: Slot): string {
  return campusById(campusForSlot(slot.id)).location;
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

const pad2 = (n: number) => String(n).padStart(2, "0");

// ───────────────────────── analytics (pure) ─────────────────────────

type FeedKind = "checkin" | "checkout" | "booking" | "topup";
interface FeedEvent {
  id: string;
  at: number;
  kind: FeedKind;
  name: string;
  slot?: string;
  amount?: number;
}

/** Derive the live activity feed from reservations + transactions. */
function buildFeed(reservations: Reservation[], transactions: Txn[]): FeedEvent[] {
  const evts: FeedEvent[] = [];
  for (const r of reservations) {
    if (r.type === "ADVANCE")
      evts.push({ id: `b-${r.id}`, at: r.createdAt, kind: "booking", name: r.driverName, slot: r.slotNumber });
    if (r.checkedInAt)
      evts.push({ id: `i-${r.id}`, at: r.checkedInAt, kind: "checkin", name: r.driverName, slot: r.slotNumber });
    if (r.checkedOutAt)
      evts.push({ id: `o-${r.id}`, at: r.checkedOutAt, kind: "checkout", name: r.driverName, slot: r.slotNumber });
  }
  for (const tx of transactions)
    if (tx.type === "TOP_UP") evts.push({ id: `t-${tx.id}`, at: tx.createdAt, kind: "topup", name: "", amount: tx.amount });
  return evts.sort((a, b) => b.at - a.at).slice(0, 24);
}

/** Revenue per hour bucket (06–22) from today's fee transactions. */
function hourBucketsRevenue(txns: Txn[]): number[] {
  const buckets = new Array(DAY_END_H - DAY_START_H + 1).fill(0);
  for (const tx of txns) {
    if (tx.type === "TOP_UP" || tx.type === "REFUND") continue;
    const h = new Date(tx.createdAt).getHours();
    if (h >= DAY_START_H && h <= DAY_END_H) buckets[h - DAY_START_H] += tx.amount;
  }
  return buckets;
}

/** Check-in counts per hour bucket (06–22) over the last 7 days. */
function hourBucketsCheckins(reservations: Reservation[], sinceMs: number): number[] {
  const buckets = new Array(DAY_END_H - DAY_START_H + 1).fill(0);
  for (const r of reservations) {
    if (!r.checkedInAt || r.checkedInAt < sinceMs) continue;
    const h = new Date(r.checkedInAt).getHours();
    if (h >= DAY_START_H && h <= DAY_END_H) buckets[h - DAY_START_H]++;
  }
  return buckets;
}

/** Max simultaneous occupancy today (sweep over check-in/out events). */
function peakOccupancyToday(reservations: Reservation[], dayStart: number): number {
  const evts: { at: number; delta: number }[] = [];
  for (const r of reservations) {
    if (r.checkedInAt && r.checkedInAt >= dayStart) evts.push({ at: r.checkedInAt, delta: 1 });
    if (r.checkedOutAt && r.checkedOutAt >= dayStart) evts.push({ at: r.checkedOutAt, delta: -1 });
  }
  evts.sort((a, b) => a.at - b.at || a.delta - b.delta);
  let cur = 0;
  let peak = 0;
  for (const e of evts) {
    cur += e.delta;
    if (cur > peak) peak = cur;
  }
  return peak;
}

// ───────────────────────── live clock ─────────────────────────

function LiveClock() {
  const lang = useParkir((s) => s.lang);
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const locale = lang === "id" ? "id-ID" : "en-US";
  return (
    <div className="shrink-0 text-right">
      <p className="tnum flex items-center justify-end gap-1.5 font-display text-xl font-bold leading-none tracking-tight">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        {now
          ? now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
          : "--:--:--"}
      </p>
      <p className="mt-1.5 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {now
          ? now.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })
          : "\u00A0"}
      </p>
    </div>
  );
}

// ───────────────────────── main view ─────────────────────────

export function OperatorView() {
  const lang = useParkir((s) => s.lang);
  const user = useParkir((s) => s.user);
  const slots = useParkir((s) => s.slots);
  const allReservations = useParkir((s) => s.reservations);
  const allTransactions = useParkir((s) => s.transactions);
  // Scope the console to the active campus — other campuses' worlds stay out.
  const campusSlotIds = React.useMemo(() => new Set(slots.map((s) => s.id)), [slots]);
  const reservations = React.useMemo(
    () => allReservations.filter((r) => campusSlotIds.has(r.slotId)),
    [allReservations, campusSlotIds]
  );
  const transactions = React.useMemo(() => {
    // Fee/refund txns are tied to a reservation code (campus-scoped);
    // blank-note txns are wallet top-ups — kept for the activity feed.
    const codes = new Set(reservations.map((r) => r.code));
    return allTransactions.filter((tx) => tx.note === "" || codes.has(tx.note));
  }, [allTransactions, reservations]);
  const forceCheckOut = useParkir((s) => s.forceCheckOut);
  const extendSession = useParkir((s) => s.extendSession);
  const manualCheckIn = useParkir((s) => s.manualCheckIn);
  const cancelReservation = useParkir((s) => s.cancelReservation);
  const signOut = useParkir((s) => s.signOut);
  const toast = useParkir((s) => s.toast);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);

  const [tab, setTab] = React.useState<OpTab>("monitor");
  const [detail, setDetail] = React.useState<Slot | null>(null);
  const [qrSlot, setQrSlot] = React.useState<Slot | null>(null);
  const [query, setQuery] = React.useState("");

  const tick = useTicker(true); // refresh durations every 30s
  const win = nowWindow();
  const todayStr = dateStr(new Date());
  const dayStart = new Date(`${todayStr}T00:00:00`).getTime();

  const stats = React.useMemo(() => {
    const c: Record<SlotStatus, number> = { AVAILABLE: 0, RESERVED: 0, OCCUPIED: 0, MAINTENANCE: 0 };
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

  const upcoming = React.useMemo(
    () =>
      reservations
        .filter((r) => r.status === "CONFIRMED" && r.date >= todayStr)
        .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)),
    [reservations, todayStr]
  );

  const completedToday = React.useMemo(
    () =>
      reservations
        .filter((r) => r.status === "COMPLETED" && r.date === todayStr && r.checkedOutAt)
        .sort((a, b) => (b.checkedOutAt ?? 0) - (a.checkedOutAt ?? 0)),
    [reservations, todayStr]
  );

  const todayTxns = React.useMemo(
    () => transactions.filter((tx) => tx.createdAt >= dayStart),
    [transactions, dayStart]
  );

  const revenue = React.useMemo(
    () =>
      todayTxns.reduce((sum, tx) => {
        if (tx.type === "TOP_UP" || tx.type === "REFUND") return sum;
        return sum + tx.amount;
      }, 0),
    [todayTxns]
  );

  const hourlyRevenue = React.useMemo(() => hourBucketsRevenue(todayTxns), [todayTxns]);

  const busyHist = React.useMemo(
    () => hourBucketsCheckins(reservations, Date.now() - WEEK_MS),
    [reservations]
  );

  const shift = React.useMemo(() => {
    const ins = reservations.filter((r) => r.checkedInAt && r.checkedInAt >= dayStart);
    const outs = reservations.filter((r) => r.checkedOutAt && r.checkedOutAt >= dayStart);
    const durs = reservations
      .filter((r) => r.checkedInAt && r.checkedOutAt && r.checkedOutAt >= dayStart)
      .map((r) => (r.checkedOutAt ?? 0) - (r.checkedInAt ?? 0));
    const avg = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : 0;
    return { ins: ins.length, outs: outs.length, avgMs: avg };
  }, [reservations, dayStart]);

  const peak = React.useMemo(
    () => peakOccupancyToday(reservations, dayStart),
    [reservations, dayStart]
  );

  const longest = React.useMemo(() => {
    let best: Reservation | null = null;
    let bestMs = 0;
    for (const r of reservations) {
      if (r.date !== todayStr || !r.checkedInAt) continue;
      const ms = (r.checkedOutAt ?? Date.now()) - r.checkedInAt;
      if (ms > bestMs) {
        bestMs = ms;
        best = r;
      }
    }
    return best ? { res: best, ms: bestMs } : null;
     
  }, [reservations, todayStr, tick]);

  const feed = React.useMemo(
    () => buildFeed(reservations, transactions),
    [reservations, transactions]
  );

  /** Live demand tier — drives the dynamic pricing strip. */
  const demand = React.useMemo(
    () => demandNow(slots, reservations),
    [slots, reservations, tick]
  );

  const searchResults = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return reservations
      .filter(
        (r) =>
          r.vehiclePlate.toLowerCase().includes(q) ||
          r.driverName.toLowerCase().includes(q) ||
          r.slotNumber.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q)
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 8);
  }, [query, reservations]);

  // ── operator actions ──
  /** Campus-scoped operations report → CSV download (Excel-friendly, UTF-8 BOM). */
  function exportCsv() {
    const resByCode = new Map(reservations.map((r) => [r.code, r]));
    const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
    const dt = (ms: number) => {
      const d = new Date(ms);
      const p = (n: number) => String(n).padStart(2, "0");
      return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
    };
    const loc = lang === "id" ? "id-ID" : "en-US";
    const id = lang === "id";
    const header = id
      ? ["Waktu", "Kode", "Kategori", "Slot", "Pengemudi", "Jumlah (Rp)"]
      : ["Time", "Code", "Category", "Slot", "Driver", "Amount (Rp)"];
    const rows = [...transactions]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((tx) => {
        const r = tx.note ? resByCode.get(tx.note) : undefined;
        return [
          dt(tx.createdAt),
          tx.note || "-",
          tr(lang, TXN_META[tx.type].labelKey),
          r?.slotNumber ?? "-",
          r?.driverName ?? "-",
          String(tx.amount),
        ];
      });
    // summary block
    const byType = {} as Record<Txn["type"], { n: number; total: number }>;
    for (const tx of transactions) {
      byType[tx.type] = byType[tx.type] ?? { n: 0, total: 0 };
      byType[tx.type].n++;
      byType[tx.type].total += tx.amount;
    }
    const revenue = (types: Txn["type"][]) =>
      types.reduce((s, ty) => s + (byType[ty]?.total ?? 0), 0);
    const nowStats = { AVAILABLE: 0, RESERVED: 0, OCCUPIED: 0, MAINTENANCE: 0 } as Record<SlotStatus, number>;
    slots.forEach((s) => nowStats[slotStatusForWindow(s, reservations, nowWindow())]++);
    const summary: (string | number)[][] = [
      ["", "", "", "", "", ""],
      [id ? "RINGKASAN" : "SUMMARY", "", "", "", "", ""],
      [id ? "Kategori" : "Category", id ? "Transaksi" : "Txns", id ? "Total (Rp)" : "Total (Rp)", "", "", ""],
      ...(Object.keys(TXN_META) as Txn["type"][]).map((ty) => [
        tr(lang, TXN_META[ty].labelKey),
        String(byType[ty]?.n ?? 0),
        String(byType[ty]?.total ?? 0),
        "",
        "",
        "",
      ]),
      [id ? "TOTAL PENDAPATAN" : "TOTAL REVENUE", "", String(revenue(["SERVICE_FEE", "PARKING_FEE", "OVERTIME"])), "", "", ""],
      ["", "", "", "", "", ""],
      [id ? "Sesi aktif" : "Active sessions", String(activeSessions.length), id ? "Okupansi" : "Occupancy", `${nowStats.OCCUPIED}/${slots.length}`, "", ""],
    ];
    const campusName = campusById(useParkir.getState().campusId).name;
    const meta = [
      [`${t("appName")} — ${t("csvExportTitle")}`],
      [id ? "Kampus" : "Campus", campusName, slotLocation(slots[0])],
      [id ? "Dibuat" : "Generated", new Date().toLocaleString(loc)],
      [""],
    ];
    const csv =
      "\uFEFF" +
      [...meta, header, ...rows, ...summary].map((r) => r.map(esc).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = (() => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
    })();
    a.download = `laporan-parkirbinus-${useParkir.getState().campusId}-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(t("csvExported"), "success");
  }

  function doForce(r: Reservation) {
    const out = forceCheckOut(r.id);
    toast(out.ok ? t("forceOk") : t("error"), out.ok ? "success" : "error");
  }
  function doExtend(r: Reservation) {
    const ok = extendSession(r.id, 1);
    toast(ok ? t("extendOk") : t("extendFail"), ok ? "success" : "error");
  }
  function doManualIn(r: Reservation) {
    if (manualCheckIn(r.id)) toast(t("manualInOk"), "success");
  }
  function doCancel(r: Reservation) {
    cancelReservation(r.id);
    toast(t("stCancelled"), "info");
  }
  function openSessionSlot(r: Reservation) {
    const slot = slots.find((s) => s.id === r.slotId);
    if (slot) setDetail(slot);
  }

  const statCards = [
    { label: t("inBuilding"), value: stats.OCCUPIED, cls: "border-red-400/25 bg-red-400/[0.06]", val: "text-red-300", icon: CarFront },
    { label: t("reservedNow"), value: stats.RESERVED, cls: "border-amber-400/25 bg-amber-400/[0.06]", val: "text-amber-300", icon: Clock3 },
    { label: t("available"), value: stats.AVAILABLE, cls: "border-emerald-400/25 bg-emerald-400/[0.06]", val: "text-emerald-300", icon: LogIn },
    { label: t("inMaintenance"), value: stats.MAINTENANCE, cls: "border-slate-500/25 bg-slate-500/[0.08]", val: "text-slate-300", icon: Wrench },
  ];

  const tabs: { k: OpTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { k: "monitor", label: t("opTabMonitor"), icon: Monitor },
    { k: "qr", label: t("opTabQr"), icon: QrCode },
    { k: "history", label: t("opTabHistory"), icon: HistoryIcon },
  ];

  return (
    <div className="space-y-4">
      {/* ── command header ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass glow-soft relative overflow-hidden rounded-3xl p-4 md:p-5"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(rgba(255,214,10,0.09) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-binus-bright/15 blur-3xl"
        />
        <div className="relative flex items-center gap-3.5">
          <div className="relative shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-binus-blue to-binus-bright">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-primary">
              <BadgeCheck className="h-3 w-3 text-primary-foreground" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-display text-base font-bold leading-tight md:text-lg">{user.name}</p>
              <span className="shrink-0 rounded-full bg-binus-bright/15 px-2 py-0.5 text-[8px] font-black tracking-wider text-binus-bright">
                {t("operatorBadge")}
              </span>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">{t("operatorShift")}</p>
          </div>
          <LiveClock />
        </div>

        {/* stat chips */}
        <div className="relative mt-4 grid grid-cols-4 gap-2">
          {statCards.map((s) => (
            <div key={s.label} className={cn("rounded-xl border p-2 text-center", s.cls)}>
              <s.icon className={cn("mx-auto h-3.5 w-3.5", s.val)} />
              <p className={cn("tnum mt-1 font-display text-lg font-bold leading-none", s.val)}>{s.value}</p>
              <p className="mt-1 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* revenue strip */}
        <div className="relative mt-2.5 flex items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.09] to-transparent px-3.5 py-2.5">
          <Banknote className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("revenueToday")}
            </p>
            <p className="tnum font-display text-xl font-bold leading-tight text-gradient-gold">{rupiah(revenue)}</p>
          </div>
          <div className="shrink-0 rounded-xl border border-border bg-card/50 px-3 py-1.5 text-center">
            <p className="tnum font-display text-sm font-bold leading-none">{todayTxns.length}</p>
            <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("txnsToday")}
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── segmented tabs ── */}
      <div className="glass grid grid-cols-3 gap-1 rounded-2xl p-1">
        {tabs.map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            aria-current={tab === k ? "page" : undefined}
            className={cn(
              "relative flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition",
              tab === k ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === k && (
              <motion.span
                layoutId="op-tab-pill"
                transition={{ type: "spring", stiffness: 480, damping: 34 }}
                className="glow-primary absolute inset-0 rounded-xl bg-primary"
              />
            )}
            <Icon className="relative h-3.5 w-3.5" />
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {/* ── search (monitor tab) ── */}
      {tab === "monitor" && (
        <div className="space-y-2">
          <div className="glass flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("opSearchPh")}
              className="tnum min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground/60 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label={t("close")}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {query.trim().length >= 2 && (
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-2"
            >
              <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
                {t("opSearchResults")} · {searchResults.length}
              </p>
              {searchResults.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">{t("opSearchNone")}</p>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => openSessionSlot(r)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card/40 px-3 py-2 text-left transition hover:bg-card/70 active:scale-[0.99]"
                    >
                      <span className="tnum flex h-8 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-display text-xs font-bold text-primary">
                        {r.slotNumber}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-bold leading-tight">{r.driverName}</span>
                        <span className="tnum block truncate text-[10px] text-muted-foreground">
                          {r.vehiclePlate} · {r.date} {r.startTime}–{r.endTime}
                        </span>
                      </span>
                      <ResStatusPill status={r.status} />
                    </button>
                  ))}
                </div>
              )}
            </motion.section>
          )}
        </div>
      )}

      {/* ── tab content ── */}
      <AnimatePresence mode="wait">
        {tab === "monitor" && (
          <motion.div
            key="tab-monitor"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-4 md:grid-cols-12"
          >
            <PricingCard className="md:col-span-12" lang={lang} demand={demand} />
            <OccupancyCard className="md:col-span-5" lang={lang} stats={stats} total={slots.length} shift={shift} />
            <RevenueCard className="md:col-span-7" lang={lang} data={hourlyRevenue} total={revenue} />
            <SlotMonitorCard className="md:col-span-7" lang={lang} slots={slots} reservations={reservations} stats={stats} onSlot={setDetail} />
            <SessionsCard
              className="md:col-span-5"
              lang={lang}
              sessions={activeSessions}
              onOpen={openSessionSlot}
              onForce={doForce}
              onExtend={doExtend}
            />
            <BusyCard className="md:col-span-5" lang={lang} hist={busyHist} />
            <UpcomingCard
              className="md:col-span-7"
              lang={lang}
              list={upcoming}
              onIn={doManualIn}
              onCancel={doCancel}
              onExtend={doExtend}
              onOpen={openSessionSlot}
            />
            <FeedCard className="md:col-span-12" lang={lang} events={feed} />
          </motion.div>
        )}

        {tab === "qr" && (
          <motion.section
            key="tab-qr"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="glass rounded-3xl p-4"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
                <QrCode className="h-4 w-4 text-primary" />
                {t("qrSlotsTitle")}
              </h3>
              <span className="tnum rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black text-primary">
                {slots.length}
              </span>
            </div>
            <p className="mb-3 text-[10.5px] leading-relaxed text-muted-foreground">
              {t("qrSlotsSub").replace("{n}", String(slots.length))}
            </p>

            <button
              onClick={() => window.print()}
              className="glow-primary flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-black text-primary-foreground transition active:scale-[0.98]"
            >
              <Printer className="h-4 w-4" />
              {t("qrPrintAll")}
              <span className="font-semibold opacity-70">
                · {t("qrPrintHint").replace("{p}", String(Math.ceil(slots.length / 8)))}
              </span>
            </button>

            <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
              {slots.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setQrSlot(s)}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card/40 p-2 transition hover:bg-card/70 active:scale-95"
                >
                  <span className="rounded-lg bg-white p-1.5 shadow-sm">
                    <QRCodeSVG
                      value={slotQrPayload(s)}
                      size={62}
                      bgColor="#ffffff"
                      fgColor="#0b1226"
                      level="M"
                      marginSize={0}
                    />
                  </span>
                  <span className="tnum font-display text-[11px] font-bold">{s.slotNumber}</span>
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {tab === "history" && (
          <motion.div
            key="tab-history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-4 md:grid-cols-12"
          >
            <RecapCard
              className="md:col-span-5"
              lang={lang}
              revenue={revenue}
              txns={todayTxns.length}
              vehicles={shift.ins}
              peak={peak}
              total={slots.length}
              longest={longest}
            />
            <CompletedCard className="md:col-span-7" lang={lang} list={completedToday} />
            <TxnLogCard
              className="md:col-span-12"
              lang={lang}
              txns={todayTxns}
              onExport={() => exportCsv()}
            />
          </motion.div>
        )}
      </AnimatePresence>

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
          {detail && <SlotDetailDialog slot={detail} onClose={() => setDetail(null)} />}
        </DialogContent>
      </Dialog>

      {/* ── slot QR dialog ── */}
      <Dialog open={!!qrSlot} onOpenChange={(v) => !v && setQrSlot(null)}>
        <DialogContent className="max-w-[380px] rounded-3xl border-border bg-card/95 p-5 backdrop-blur-xl">
          {qrSlot && <QrSlotDetailDialog slot={qrSlot} onClose={() => setQrSlot(null)} />}
        </DialogContent>
      </Dialog>

      {/* ── print-only sheet: campus QR cards · A4 · 8 cards/page (2×4) ── */}
      <div id="qr-print-sheet" className="hidden">
        <div className="mb-[4mm] flex items-end justify-between border-b-[0.3mm] border-slate-300 pb-[2mm]">
          <div>
            <p className="text-[13pt] font-black leading-tight text-[#070B16]">
              {t("appName")} — {t("qrSlotsTitle")}
            </p>
            <p className="text-[8pt] text-slate-600">
              {t("qrPrintBrand")} · {(slots[0] && slotLocation(slots[0])) || ""} ·{" "}
              {new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <p className="tnum shrink-0 text-[8pt] font-bold text-slate-500">
            {slots.length} QR · PB-A-01 … PB-B-14
          </p>
        </div>
        {Array.from({ length: Math.ceil(slots.length / 8) }, (_, p) => (
          <div
            key={p}
            className={cn(
              "grid grid-cols-2 gap-[4mm]",
              p < Math.ceil(slots.length / 8) - 1 && "break-after-page"
            )}
          >
            {slots.slice(p * 8, p * 8 + 8).map((s) => (
              <QrPrintCard key={s.id} slot={s} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── monitor tab cards ─────────────────────────

/** Live dynamic-pricing strip — active tier, running prices, occupancy gauge. */
function PricingCard({
  className,
  lang,
  demand,
}: {
  className?: string;
  lang: string;
  demand: DemandInfo;
}) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang as "id" | "en", k);
  const pricing = DEMAND_TIERS[demand.tier];
  const meta = {
    LOW: {
      label: t("dynLow"),
      icon: TrendingDown,
      chip: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
      bar: "bg-emerald-400",
      next: t("dynNextLow"),
    },
    NORMAL: {
      label: t("dynNormal"),
      icon: Activity,
      chip: "border-sky-400/30 bg-sky-400/10 text-sky-300",
      bar: "bg-sky-400",
      next: t("dynNextNormal"),
    },
    HIGH: {
      label: t("dynHigh"),
      icon: TrendingUp,
      chip: "border-amber-400/30 bg-amber-400/10 text-amber-300",
      bar: "bg-gradient-to-r from-amber-400 to-red-400",
      next: t("dynNextHigh"),
    },
  }[demand.tier];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("glass rounded-3xl p-4", className)}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-5">
        {/* tier identity */}
        <div className="flex min-w-0 items-center gap-3 md:w-[212px] md:shrink-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.08]">
            <Zap className="h-4.5 w-4.5 text-primary" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-bold leading-tight tracking-tight">
              {t("dynTitle")}
            </h3>
            <span
              className={cn(
                "mt-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                meta.chip
              )}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute h-full w-full animate-ping rounded-full bg-current opacity-60" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
              </span>
              {meta.label}
            </span>
          </div>
        </div>

        {/* running prices */}
        <div className="flex flex-1 items-stretch gap-2.5">
          <div className="flex-1 rounded-xl border border-border bg-card/50 px-3 py-2 text-center">
            <p className="text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("dynReserve")}
            </p>
            <p className="tnum mt-0.5 font-display text-lg font-bold leading-tight text-primary">
              {rupiah(pricing.advanceFee)}
            </p>
          </div>
          <div className="flex-1 rounded-xl border border-border bg-card/50 px-3 py-2 text-center">
            <p className="text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("dynWalkin")}
            </p>
            <p className="tnum mt-0.5 font-display text-lg font-bold leading-tight">
              {rupiah(pricing.walkInFee)}
            </p>
          </div>
          <div className="hidden w-[104px] shrink-0 rounded-xl border border-border bg-card/50 px-3 py-2 text-center sm:block">
            <p className="text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("dynOvertime")}
            </p>
            <p className="tnum mt-0.5 font-display text-lg font-bold leading-tight text-muted-foreground">
              {rupiah(TARIFF.overtimeFeePerHour)}
              <span className="text-[10px] font-semibold">{lang === "id" ? "/jam" : "/h"}</span>
            </p>
          </div>
        </div>

        {/* occupancy gauge with tier thresholds */}
        <div className="md:w-[210px] md:shrink-0">
          <div className="flex items-baseline justify-between">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("dynOccupiedPct")}
            </p>
            <p className="tnum text-sm font-bold">{demand.pct}%</p>
          </div>
          <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
            <span aria-hidden className="absolute inset-y-0 left-[40%] z-10 w-px bg-white/20" />
            <span aria-hidden className="absolute inset-y-0 left-[75%] z-10 w-px bg-white/20" />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${demand.pct}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className={cn("h-full rounded-full", meta.bar)}
            />
          </div>
          <p className="mt-1.5 truncate text-[9px] text-muted-foreground/70">
            {meta.next} · {t("dynAutoNote")}
          </p>
        </div>
      </div>
    </motion.section>
  );
}

const RING_COLORS: Record<Exclude<SlotStatus, never>, string> = {
  OCCUPIED: "#f87171",
  RESERVED: "#fbbf24",
  MAINTENANCE: "#64748b",
  AVAILABLE: "#34d399",
};

/** Donut occupancy ring + per-status legend + shift statistics. */
function OccupancyCard({
  className,
  lang,
  stats,
  total,
  shift,
}: {
  className?: string;
  lang: string;
  stats: Record<SlotStatus, number>;
  total: number;
  shift: { ins: number; outs: number; avgMs: number };
}) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang as "id" | "en", k);
  const pct = Math.round((stats.OCCUPIED / Math.max(1, total)) * 100);
  const R = 44;
  const C = 2 * Math.PI * R;
  const segs: { key: SlotStatus; color: string }[] = [
    { key: "OCCUPIED", color: RING_COLORS.OCCUPIED },
    { key: "RESERVED", color: RING_COLORS.RESERVED },
    { key: "MAINTENANCE", color: RING_COLORS.MAINTENANCE },
    { key: "AVAILABLE", color: RING_COLORS.AVAILABLE },
  ];
  const legend: { key: SlotStatus; label: string; dot: string; text: string }[] = [
    { key: "OCCUPIED", label: t("inBuilding"), dot: "bg-red-400", text: "text-red-300" },
    { key: "RESERVED", label: t("reservedNow"), dot: "bg-amber-400", text: "text-amber-300" },
    { key: "MAINTENANCE", label: t("inMaintenance"), dot: "bg-slate-500", text: "text-slate-400" },
    { key: "AVAILABLE", label: t("available"), dot: "bg-emerald-400", text: "text-emerald-300" },
  ];
  let acc = 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("glass rounded-3xl p-4", className)}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
          <Gauge className="h-4 w-4 text-primary" />
          {t("occupancyTitle")}
        </h3>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
          <Activity className="h-3 w-3" />
          {t("floorLabel").split("—")[0].trim()}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90">
            <circle cx="56" cy="56" r={R} fill="none" stroke="currentColor" strokeWidth="12" className="text-white/[0.06]" />
            {segs.map((s) => {
              const n = stats[s.key];
              const len = (n / Math.max(1, total)) * C;
              const gap = n > 0 ? Math.min(3, len) : 0;
              const offset = -acc;
              acc += len;
              return (
                <circle
                  key={s.key}
                  cx="56"
                  cy="56"
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="12"
                  strokeDasharray={`${Math.max(0, len - gap)} ${C - Math.max(0, len - gap)}`}
                  strokeDashoffset={offset}
                  opacity={n > 0 ? 1 : 0}
                  className="transition-all duration-700"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="tnum font-display text-2xl font-bold leading-none">{pct}%</p>
            <p className="tnum mt-1 text-[9px] font-semibold text-muted-foreground">
              {stats.OCCUPIED}/{total} {t("occupancyFilled")}
            </p>
          </div>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-2">
          {legend.map((l) => (
            <div key={l.key} className="flex items-center gap-2">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", l.dot)} />
              <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-muted-foreground">{l.label}</span>
              <span className={cn("tnum text-[13px] font-bold", l.text)}>{stats[l.key]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-border/60 pt-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07]">
            <LogIn className="h-3.5 w-3.5 text-emerald-400" />
          </span>
          <div className="min-w-0">
            <p className="tnum font-display text-base font-bold leading-none">{shift.ins}</p>
            <p className="mt-0.5 truncate text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("shiftCheckins")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/[0.07]">
            <LogOut className="h-3.5 w-3.5 text-sky-400" />
          </span>
          <div className="min-w-0">
            <p className="tnum font-display text-base font-bold leading-none">{shift.outs}</p>
            <p className="mt-0.5 truncate text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("shiftCheckouts")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.08]">
            <Timer className="h-3.5 w-3.5 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="tnum font-display text-base font-bold leading-none">{fmtDuration(shift.avgMs)}</p>
            <p className="mt-0.5 truncate text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("shiftAvgStay")}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/** Revenue per hour bar chart with peak highlight. */
function RevenueCard({
  className,
  lang,
  data,
  total,
}: {
  className?: string;
  lang: string;
  data: number[];
  total: number;
}) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang as "id" | "en", k);
  const max = Math.max(1, ...data);
  const peakIdx = data.findIndex((v) => v === max);
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className={cn("glass rounded-3xl p-4", className)}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
          <BarChart3 className="h-4 w-4 text-primary" />
          {t("revenueHourTitle")}
        </h3>
        <p className="tnum shrink-0 font-display text-base font-bold text-gradient-gold">{rupiah(total)}</p>
      </div>
      <p className="mb-3 text-[10px] text-muted-foreground">{t("revenueHourSub")}</p>

      <div className="flex h-[104px] items-end gap-[3px]">
        {data.map((v, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end" title={`${pad2(i + DAY_START_H)}:00 · ${rupiah(v)}`}>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${v > 0 ? Math.max(6, (v / max) * 100) : 3}%` }}
              transition={{ duration: 0.55, delay: 0.15 + i * 0.025, ease: "easeOut" }}
              className={cn(
                "rounded-[3px]",
                i === peakIdx && v > 0
                  ? "bg-primary shadow-[0_0_14px_rgba(255,214,10,0.4)]"
                  : "bg-binus-blue/45 dark:bg-binus-blue/45"
              )}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[3px]">
        {data.map((_, i) => (
          <span
            key={i}
            className="tnum flex-1 text-center text-[8px] font-semibold text-muted-foreground/60"
          >
            {i % 2 === 0 ? pad2(i + DAY_START_H) : ""}
          </span>
        ))}
      </div>
      {peakIdx >= 0 && data[peakIdx] > 0 && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[9.5px] font-bold text-primary">
          <TimerReset className="h-3 w-3" />
          {t("peakChip")} {pad2(peakIdx + DAY_START_H)}:00 · {rupiah(data[peakIdx])}
        </p>
      )}
    </motion.section>
  );
}

/** Live slot grid — tap a tile for detail & maintenance control. */
function SlotMonitorCard({
  className,
  lang,
  slots,
  reservations,
  stats,
  onSlot,
}: {
  className?: string;
  lang: string;
  slots: Slot[];
  reservations: Reservation[];
  stats: Record<SlotStatus, number>;
  onSlot: (s: Slot) => void;
}) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang as "id" | "en", k);
  const win = nowWindow();
  const rowA = slots.filter((s) => s.rowLabel === "A");
  const rowB = slots.filter((s) => s.rowLabel === "B");
  const legend = [
    { st: "OCCUPIED" as SlotStatus, label: t("inBuilding"), dot: "bg-red-400", n: stats.OCCUPIED },
    { st: "RESERVED" as SlotStatus, label: t("reservedNow"), dot: "bg-amber-400", n: stats.RESERVED },
    { st: "AVAILABLE" as SlotStatus, label: t("available"), dot: "bg-emerald-400", n: stats.AVAILABLE },
    { st: "MAINTENANCE" as SlotStatus, label: t("inMaintenance"), dot: "bg-slate-500", n: stats.MAINTENANCE },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className={cn("glass rounded-3xl p-4", className)}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
          <Monitor className="h-4 w-4 text-primary" />
          {t("liveMonitor")}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {legend.map((l) => (
            <span key={l.st} className="inline-flex items-center gap-1.5 text-[9.5px] font-semibold text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", l.dot)} />
              {l.label}
              <span className="tnum font-bold text-foreground/80">{l.n}</span>
            </span>
          ))}
        </div>
      </div>

      {([
        { key: "A", list: rowA },
        { key: "B", list: rowB },
      ] as const).map(({ key, list }) => (
        <div key={key} className="mb-2 last:mb-0">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
            {lang === "id" ? `Baris ${key}` : `Row ${key}`} · {list.length}
          </p>
          <div className="grid grid-cols-6 gap-1.5 md:grid-cols-9">
            {list.map((s) => {
              const st = slotStatusForWindow(s, reservations, win);
              const tile = TILE[st];
              return (
                <button
                  key={s.id}
                  onClick={() => onSlot(s)}
                  className={cn(
                    "tnum relative flex h-10 items-center justify-center rounded-xl border font-display text-[11px] font-bold transition active:scale-90 md:h-11",
                    tile.box,
                    tile.num
                  )}
                >
                  {s.slotNumber}
                  {st === "MAINTENANCE" && <Wrench className="absolute right-1 top-1 h-2.5 w-2.5 opacity-60" />}
                  {st === "OCCUPIED" && <CarFront className="absolute right-1 top-1 h-2.5 w-2.5 opacity-60" />}
                  {st === "RESERVED" && <Clock3 className="absolute right-1 top-1 h-2.5 w-2.5 opacity-60" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="mt-3 text-center text-[10px] text-muted-foreground/70">
        {lang === "id" ? "Ketuk slot untuk detail & kontrol perawatan" : "Tap a slot for details & maintenance control"}
      </p>
    </motion.section>
  );
}

/** Active sessions with inline force check-out & extend actions. */
function SessionsCard({
  className,
  lang,
  sessions,
  onOpen,
  onForce,
  onExtend,
}: {
  className?: string;
  lang: string;
  sessions: Reservation[];
  onOpen: (r: Reservation) => void;
  onForce: (r: Reservation) => void;
  onExtend: (r: Reservation) => void;
}) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang as "id" | "en", k);
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className={cn("glass rounded-3xl p-4", className)}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
          <CarFront className="h-4 w-4 text-red-400" />
          {t("activeSessionsTitle")}
        </h3>
        <span className="tnum rounded-full bg-red-400/15 px-2 py-0.5 text-[10px] font-black text-red-300">
          {sessions.length}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {sessions.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">{t("noActiveSessions")}</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((r) => {
              const dur = fmtDuration(Date.now() - (r.checkedInAt ?? Date.now()));
              const late = Date.now() > new Date(`${r.date}T${r.endTime}:00`).getTime();
              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-2xl border p-2.5 transition",
                    late
                      ? "border-red-400/30 bg-red-400/[0.06]"
                      : "border-border bg-card/40"
                  )}
                >
                  <button onClick={() => onOpen(r)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                    <span className="tnum flex h-9 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display text-xs font-bold text-primary">
                      {r.slotNumber}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-bold leading-tight">{r.driverName}</span>
                      <span className="tnum block truncate text-[10px] text-muted-foreground">
                        {r.vehicleName} · {r.vehiclePlate}
                      </span>
                      <span className="tnum mt-0.5 block text-[9.5px] text-muted-foreground/70">
                        {t("sinceLabel")} {r.checkedInAt ? timeStr(new Date(r.checkedInAt)) : "—"} ·{" "}
                        <span className={cn("font-bold", late ? "text-red-400" : "text-foreground/80")}>{dur}</span>
                        {late && (
                          <span className="ml-1 font-bold text-red-400">
                            · {lang === "id" ? "lewat jadwal" : "overdue"}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      onClick={() => onExtend(r)}
                      title={t("btnExtend")}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/[0.08] text-primary transition hover:bg-primary/20 active:scale-90"
                    >
                      <Clock3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onForce(r)}
                      title={t("btnForce")}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-400/30 bg-red-400/[0.08] text-red-400 transition hover:bg-red-400/20 active:scale-90"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

/** Peak-hours chart: check-in counts per hour over the last 7 days. */
function BusyCard({ className, lang, hist }: { className?: string; lang: string; hist: number[] }) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang as "id" | "en", k);
  const max = Math.max(1, ...hist);
  const topIdx = hist.findIndex((v) => v === max);
  const sorted = [...hist].map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const hot = new Set(sorted.slice(0, 2).filter((x) => x.v > 0).map((x) => x.i));
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className={cn("glass rounded-3xl p-4", className)}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
          <Clock3 className="h-4 w-4 text-primary" />
          {t("busyTitle")}
        </h3>
        {topIdx >= 0 && hist[topIdx] > 0 && (
          <span className="tnum inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9.5px] font-bold text-primary">
            <TimerReset className="h-3 w-3" />
            {t("peakChip")} {pad2(topIdx + DAY_START_H)}:00–{pad2(topIdx + DAY_START_H + 1)}:00
          </span>
        )}
      </div>
      <p className="mb-3 text-[10px] text-muted-foreground">{t("busySub")}</p>

      <div className="flex h-[92px] items-end gap-[3px]">
        {hist.map((v, i) => (
          <div
            key={i}
            className="flex h-full flex-1 flex-col justify-end"
            title={`${pad2(i + DAY_START_H)}:00 · ${v} ${lang === "id" ? "check-in" : "check-ins"}`}
          >
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${v > 0 ? Math.max(8, (v / max) * 100) : 3}%` }}
              transition={{ duration: 0.55, delay: 0.2 + i * 0.025, ease: "easeOut" }}
              className={cn(
                "rounded-[3px]",
                hot.has(i) ? "bg-primary shadow-[0_0_12px_rgba(255,214,10,0.35)]" : "bg-emerald-400/35 dark:bg-emerald-400/35"
              )}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[3px]">
        {hist.map((_, i) => (
          <span key={i} className="tnum flex-1 text-center text-[8px] font-semibold text-muted-foreground/60">
            {i % 2 === 0 ? pad2(i + DAY_START_H) : ""}
          </span>
        ))}
      </div>
    </motion.section>
  );
}

/** Today's + upcoming reservations with manual check-in / extend / cancel. */
function UpcomingCard({
  className,
  lang,
  list,
  onIn,
  onCancel,
  onExtend,
  onOpen,
}: {
  className?: string;
  lang: string;
  list: Reservation[];
  onIn: (r: Reservation) => void;
  onCancel: (r: Reservation) => void;
  onExtend: (r: Reservation) => void;
  onOpen: (r: Reservation) => void;
}) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang as "id" | "en", k);
  const nowMs = Date.now();
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.25 }}
      className={cn("glass rounded-3xl p-4", className)}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
          <CalendarPlus className="h-4 w-4 text-primary" />
          {t("upcomingTitle")}
        </h3>
        <span className="tnum rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black text-primary">
          {list.length}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {list.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">{t("upcomingEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {list.map((r) => {
              const startMs = new Date(`${r.date}T${r.startTime}:00`).getTime();
              const endMs = new Date(`${r.date}T${r.endTime}:00`).getTime();
              const inWindow = nowMs >= startMs && nowMs <= endMs;
              const soon = !inWindow && nowMs < startMs && startMs - nowMs < 60 * 60_000;
              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-2xl border p-2.5 transition",
                    inWindow
                      ? "border-amber-400/30 bg-amber-400/[0.06]"
                      : soon
                        ? "border-primary/25 bg-primary/[0.05]"
                        : "border-border bg-card/40"
                  )}
                >
                  <button onClick={() => onOpen(r)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                    <span className="tnum flex h-9 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display text-xs font-bold text-primary">
                      {r.slotNumber}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-bold leading-tight">{r.driverName}</span>
                      <span className="tnum block truncate text-[10px] text-muted-foreground">
                        {r.vehicleName} · {r.vehiclePlate}
                      </span>
                      <span className="tnum mt-0.5 block text-[9.5px] text-muted-foreground/70">
                        {r.startTime}–{r.endTime}
                        {inWindow && (
                          <span className="ml-1 font-bold text-amber-400">
                            · {lang === "id" ? "menunggu check-in" : "awaiting check-in"}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => onExtend(r)}
                      title={t("btnExtend")}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card/50 text-muted-foreground transition hover:border-primary/40 hover:text-primary active:scale-90"
                    >
                      <Clock3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onIn(r)}
                      className="flex h-7 items-center justify-center gap-1 rounded-lg bg-primary px-2.5 text-[10px] font-black text-primary-foreground transition hover:bg-primary/90 active:scale-95"
                    >
                      <LogIn className="h-3 w-3" />
                      {t("btnManualIn")}
                    </button>
                    <button
                      onClick={() => onCancel(r)}
                      title={t("cancelBooking")}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-400/25 bg-red-400/[0.06] text-red-400 transition hover:bg-red-400/15 active:scale-90"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

const FEED_STYLE: Record<FeedKind, { icon: React.ComponentType<{ className?: string }>; cls: string; labelKey: Parameters<typeof tr>[1] }> = {
  checkin: { icon: LogIn, cls: "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-400", labelKey: "evCheckin" },
  checkout: { icon: LogOut, cls: "border-sky-400/25 bg-sky-400/[0.07] text-sky-400", labelKey: "evCheckout" },
  booking: { icon: CalendarPlus, cls: "border-primary/25 bg-primary/[0.07] text-primary", labelKey: "evBooking" },
  topup: { icon: Wallet, cls: "border-primary/25 bg-primary/[0.07] text-primary", labelKey: "evTopup" },
};

/** Live activity feed — derived from real store events, newest first. */
function FeedCard({ className, lang, events }: { className?: string; lang: string; events: FeedEvent[] }) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang as "id" | "en", k);
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.3 }}
      className={cn("glass rounded-3xl p-4", className)}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
          <Activity className="h-4 w-4 text-emerald-400" />
          {t("feedTitle")}
        </h3>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
      </div>

      {events.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">{t("feedEmpty")}</p>
      ) : (
        <div className="max-h-[340px] space-y-1.5 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {events.map((e, i) => {
              const st = FEED_STYLE[e.kind];
              const Icon = st.icon;
              return (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.02 }}
                  className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/30 px-2.5 py-2"
                >
                  <span className="tnum w-[38px] shrink-0 text-[10px] font-bold text-muted-foreground/70">
                    {timeStr(new Date(e.at))}
                  </span>
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border", st.cls)}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <p className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground">
                    {e.kind === "topup" ? (
                      <>
                        <span className="font-bold text-foreground">{t("evTopup")}</span>{" "}
                        <span className="tnum font-bold text-primary">{rupiah(e.amount ?? 0)}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-foreground">{e.name}</span> {t(st.labelKey)}
                        {e.slot && (
                          <span className="tnum ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[9.5px] font-bold text-primary">
                            {e.slot}
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.section>
  );
}

// ───────────────────────── history tab cards ─────────────────────────

/** Today's recap — revenue, transactions, vehicles, peak occupancy, longest stay. */
function RecapCard({
  className,
  lang,
  revenue,
  txns,
  vehicles,
  peak,
  total,
  longest,
}: {
  className?: string;
  lang: string;
  revenue: number;
  txns: number;
  vehicles: number;
  peak: number;
  total: number;
  longest: { res: Reservation; ms: number } | null;
}) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang as "id" | "en", k);
  const tiles = [
    { label: t("txnsToday"), value: String(txns), icon: ClipboardList, cls: "border-sky-400/25 bg-sky-400/[0.06]", val: "text-sky-300" },
    { label: t("recapVehicles"), value: String(vehicles), icon: LogIn, cls: "border-emerald-400/25 bg-emerald-400/[0.06]", val: "text-emerald-300" },
    { label: t("recapPeak"), value: `${peak}/${total}`, icon: Gauge, cls: "border-red-400/25 bg-red-400/[0.06]", val: "text-red-300" },
    { label: t("recapLongest"), value: longest ? fmtDuration(longest.ms) : "—", icon: Timer, cls: "border-primary/25 bg-primary/[0.07]", val: "text-primary", sub: longest?.res.vehiclePlate },
  ];
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("glass rounded-3xl p-4", className)}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
          <ClipboardList className="h-4 w-4 text-primary" />
          {t("recapTitle")}
        </h3>
        <span className="tnum text-[9.5px] font-semibold text-muted-foreground">
          {new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short" })}
        </span>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.09] to-transparent px-3.5 py-3">
        <Banknote className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("revenueToday")}
          </p>
          <p className="tnum font-display text-2xl font-bold leading-tight text-gradient-gold">{rupiah(revenue)}</p>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {tiles.map((s) => (
          <div key={s.label} className={cn("rounded-2xl border p-3", s.cls)}>
            <s.icon className={cn("h-4 w-4", s.val)} />
            <p className={cn("tnum mt-1.5 font-display text-lg font-bold leading-none", s.val)}>{s.value}</p>
            <p className="mt-1 truncate text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              {s.label}
              {s.sub ? <span className="tnum ml-1 normal-case text-foreground/70">· {s.sub}</span> : null}
            </p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

/** Completed sessions today — in/out times, duration, fees. */
function CompletedCard({ className, lang, list }: { className?: string; lang: string; list: Reservation[] }) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang as "id" | "en", k);
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className={cn("glass rounded-3xl p-4", className)}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
          <Car className="h-4 w-4 text-primary" />
          {t("completedTodayTitle")}
        </h3>
        <span className="tnum rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black text-emerald-300">
          {list.length}
        </span>
      </div>

      {list.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">{t("completedEmpty")}</p>
      ) : (
        <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
          {list.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/30 px-2.5 py-2"
            >
              <span className="tnum flex h-8 w-11 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] font-display text-xs font-bold text-gradient-gold">
                {r.slotNumber}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-bold leading-tight">{r.driverName}</p>
                <p className="tnum truncate text-[9.5px] text-muted-foreground">
                  {r.vehiclePlate} · {r.checkedInAt ? timeStr(new Date(r.checkedInAt)) : "—"} →{" "}
                  {r.checkedOutAt ? timeStr(new Date(r.checkedOutAt)) : "—"} ·{" "}
                  {fmtDuration((r.checkedOutAt ?? 0) - (r.checkedInAt ?? 0))}
                  {r.overtimeFee > 0 && (
                    <span className="ml-1 font-bold text-amber-400">+{lang === "id" ? "lembur" : "overtime"}</span>
                  )}
                </p>
              </div>
              <p className="tnum shrink-0 text-[12.5px] font-bold text-primary">
                {rupiah(r.parkingFee + r.overtimeFee)}
              </p>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
}

const TXN_META: Record<
  Txn["type"],
  { icon: React.ComponentType<{ className?: string }>; labelKey: Parameters<typeof tr>[1]; cls: string }
> = {
  TOP_UP: { icon: Plus, labelKey: "tTopUp", cls: "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-400" },
  SERVICE_FEE: { icon: QrCode, labelKey: "tServiceFee", cls: "border-primary/25 bg-primary/[0.07] text-primary" },
  PARKING_FEE: { icon: Car, labelKey: "tParkingFee", cls: "border-sky-400/25 bg-sky-400/[0.07] text-sky-400" },
  OVERTIME: { icon: TimerReset, labelKey: "tOvertime", cls: "border-amber-400/25 bg-amber-400/[0.07] text-amber-400" },
  REFUND: { icon: LogOut, labelKey: "tRefund", cls: "border-red-400/25 bg-red-400/[0.07] text-red-400" },
};

/** Today's transaction log. */
function TxnLogCard({
  className,
  lang,
  txns,
  onExport,
}: {
  className?: string;
  lang: string;
  txns: Txn[];
  onExport?: () => void;
}) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang as "id" | "en", k);
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className={cn("glass rounded-3xl p-4", className)}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
          <Wallet className="h-4 w-4 text-primary" />
          {t("txnLogTitle")}
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="tnum rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black text-primary">
            {txns.length}
          </span>
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary transition hover:bg-primary/20"
            >
              <Download className="h-3 w-3" />
              {t("csvExport")}
            </button>
          )}
        </div>
      </div>

      {txns.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">{t("feedEmpty")}</p>
      ) : (
        <div className="max-h-[380px] space-y-1.5 overflow-y-auto pr-1">
          {txns.map((x) => {
            const meta = TXN_META[x.type];
            const Icon = meta.icon;
            const credit = x.type === "TOP_UP" || x.type === "REFUND";
            return (
              <div
                key={x.id}
                className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/30 px-2.5 py-2"
              >
                <span className="tnum w-[38px] shrink-0 text-[10px] font-bold text-muted-foreground/70">
                  {timeStr(new Date(x.createdAt))}
                </span>
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border", meta.cls)}>
                  <Icon className="h-3 w-3" />
                </span>
                <p className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground">
                  <span className="font-bold text-foreground">{t(meta.labelKey)}</span>
                  {x.note && <span className="tnum ml-1.5 text-[10px] text-muted-foreground/70">{x.note}</span>}
                </p>
                <p className={cn("tnum shrink-0 text-[12px] font-bold", credit ? "text-emerald-400" : "text-primary")}>
                  {credit ? "+" : ""}
                  {rupiah(x.amount)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}

// ───────────────────────── dialogs ─────────────────────────

/** Slot detail — status, occupant/booking info, session control, maintenance. */
function SlotDetailDialog({ slot, onClose }: { slot: Slot; onClose: () => void }) {
  const lang = useParkir((s) => s.lang);
  const reservations = useParkir((s) => s.reservations);
  const setSlotStatus = useParkir((s) => s.setSlotStatus);
  const forceCheckOut = useParkir((s) => s.forceCheckOut);
  const extendSession = useParkir((s) => s.extendSession);
  const manualCheckIn = useParkir((s) => s.manualCheckIn);
  const cancelReservation = useParkir((s) => s.cancelReservation);
  const toast = useParkir((s) => s.toast);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);

  const st = slotStatusForWindow(slot, reservations, nowWindow());
  const session = reservations.find((r) => r.slotId === slot.id && r.status === "CHECKED_IN");
  const booked = reservations.find((r) => r.slotId === slot.id && r.status === "CONFIRMED");
  const tile = TILE[st];

  function toggleMaintenance() {
    const next = slot.status === "MAINTENANCE" ? "ACTIVE" : "MAINTENANCE";
    setSlotStatus(slot.id, next);
    toast(next === "MAINTENANCE" ? t("maintenanceDone") : t("reactivated"), next === "MAINTENANCE" ? "info" : "success");
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
            <DetailRow label={t("windowLabel")} value={`${session.date} · ${session.startTime}–${session.endTime}`} />
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

      {/* session control */}
      {session && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              const ok = extendSession(session.id, 1);
              toast(ok ? t("extendOk") : t("extendFail"), ok ? "success" : "error");
            }}
            className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-primary/30 bg-primary/[0.08] text-xs font-bold text-primary transition hover:bg-primary/15 active:scale-[0.98]"
          >
            <Clock3 className="h-4 w-4" />
            {t("btnExtend")}
          </button>
          <button
            onClick={() => {
              const out = forceCheckOut(session.id);
              toast(out.ok ? t("forceOk") : t("error"), out.ok ? "success" : "error");
              if (out.ok) onClose();
            }}
            className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-red-400/30 bg-red-400/10 text-xs font-bold text-red-400 transition hover:bg-red-400/20 active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" />
            {t("btnForce")}
          </button>
        </div>
      )}

      {booked && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              if (manualCheckIn(booked.id)) {
                toast(t("manualInOk"), "success");
                onClose();
              }
            }}
            className="glow-primary flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-primary text-xs font-bold text-primary-foreground transition active:scale-[0.98]"
          >
            <LogIn className="h-4 w-4" />
            {t("btnManualIn")}
          </button>
          <button
            onClick={() => {
              cancelReservation(booked.id);
              toast(t("stCancelled"), "info");
              onClose();
            }}
            className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-red-400/30 bg-red-400/10 text-xs font-bold text-red-400 transition hover:bg-red-400/20 active:scale-[0.98]"
          >
            <X className="h-4 w-4" />
            {t("cancelBooking")}
          </button>
        </div>
      )}

      <button
        onClick={toggleMaintenance}
        className={cn(
          "mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-xs font-bold transition active:scale-[0.98]",
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

/** Slot QR detail — big QR, code & hi-res PNG download */
function QrSlotDetailDialog({ slot, onClose }: { slot: Slot; onClose: () => void }) {
  const lang = useParkir((s) => s.lang);
  const toast = useParkir((s) => s.toast);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const wrap = React.useRef<HTMLDivElement>(null);
  const payload = slotQrPayload(slot);

  function downloadPng() {
    const canvas = wrap.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `QR-ParkirBinus-${slot.slotNumber}.png`;
    a.click();
    toast(t("qrSaved"), "success");
  }

  return (
    <>
      <DialogHeader className="space-y-1.5">
        <span className="mx-auto rounded-2xl bg-white p-3 shadow-lg">
          <QRCodeSVG
            value={payload}
            size={150}
            bgColor="#ffffff"
            fgColor="#0b1226"
            level="M"
            marginSize={2}
          />
        </span>
        <DialogTitle className="text-center font-display text-lg font-bold tracking-tight">
          {slot.slotNumber}
        </DialogTitle>
        <DialogDescription className="text-center text-xs text-muted-foreground">
          {slotLocation(slot)}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-3 space-y-2">
        <DetailRow label={t("qrCodeLabel")} value={payload} />
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-3">
          <QrCode className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs font-semibold text-primary/90">{t("qrCardHint")}</p>
        </div>
      </div>

      <button
        onClick={downloadPng}
        className="glow-primary mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground transition active:scale-[0.98]"
      >
        <Download className="h-4 w-4" />
        {t("qrDownload")}
      </button>

      <button
        onClick={onClose}
        className="mx-auto mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
        {t("close")}
      </button>

      {/* offscreen hi-res canvas for the PNG export */}
      <div ref={wrap} aria-hidden className="pointer-events-none absolute -left-[9999px] top-0">
        <QRCodeCanvas
          value={payload}
          size={1024}
          bgColor="#ffffff"
          fgColor="#0b1226"
          level="M"
          marginSize={4}
        />
      </div>
    </>
  );
}

// ───────────────────────── print card ─────────────────────────

/** Print card — one physical slot sign: QR + slot number + mounting info. */
function QrPrintCard({ slot }: { slot: Slot }) {
  const lang = useParkir((s) => s.lang);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  return (
    <div className="flex h-[60mm] items-center gap-[4mm] break-inside-avoid rounded-[3mm] border-[0.4mm] border-dashed border-slate-400 bg-white p-[4mm] text-black">
      <QRCodeSVG
        value={slotQrPayload(slot)}
        size={512}
        style={{ width: "46mm", height: "46mm" }}
        bgColor="#ffffff"
        fgColor="#000000"
        level="M"
        marginSize={0}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[7pt] font-black uppercase tracking-[0.22em] text-[#1E3A8A]">
          {t("appName")}
        </p>
        <p className="tnum text-[28pt] font-black leading-[1.05] text-[#070B16]">{slot.slotNumber}</p>
        <p className="tnum mt-[1.5mm] text-[9pt] font-bold text-slate-700">
          {lang === "id" ? "Kode" : "Code"}: {slotQrPayload(slot)}
        </p>
        <p className="text-[7.5pt] leading-snug text-slate-600">{slotLocation(slot)}</p>
        <p className="mt-[2mm] inline-block rounded-[1.5mm] bg-[#FFD60A] px-[2mm] py-[0.8mm] text-[7pt] font-black uppercase tracking-wide text-[#070B16]">
          {t("qrCardHint")}
        </p>
      </div>
    </div>
  );
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
