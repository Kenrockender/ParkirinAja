"use client";
/** BookingView - pick type, vehicle & window, then pay from wallet. */
import React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Accessibility,
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock,
  Gauge,
  Lock,
  QrCode,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { DateGrid, TimeGrid, WindowPicker, fmtDateLabel } from "./WindowPickers";
import { useParkir } from "@/lib/store";
import {
  campusById,
  dateStr,
  demandNow,
  DEMAND_TIERS,
  TARIFF,
  fromMinutes,
  rupiah,
  toMinutes,
  tr,
  type ResType,
} from "@/lib/parking-data";
import { cn } from "@/lib/utils";

export function BookingView({
  slotId,
  slotNumber,
  defaultType,
  onDone,
  onBack,
}: {
  slotId: string;
  slotNumber: string;
  defaultType: ResType;
  onDone: (resId: string) => void;
  onBack: () => void;
}) {
  const lang = useParkir((s) => s.lang);
  const vehicles = useParkir((s) => s.vehicles);
  const walletBalance = useParkir((s) => s.walletBalance);
  const globalWin = useParkir((s) => s.viewWindow);
  const isBinusian = useParkir((s) => s.user.isBinusian);
  const slots = useParkir((s) => s.slots);
  const reservations = useParkir((s) => s.reservations);
  const book = useParkir((s) => s.book);
  const campus = campusById(useParkir((s) => s.campusId));
  const toast = useParkir((s) => s.toast);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);

  /** Live demand snapshot - the fee follows the active tier in real time. */
  const demand = demandNow(slots, reservations);
  const pricing = DEMAND_TIERS[demand.tier];

  /** Look up full slot object for slotType badge */
  const slotObj = slots.find((s) => s.id === slotId);
  const tierMeta = {
    LOW: {
      label: t("dynLow"),
      note: t("dynBannerLow"),
      icon: TrendingDown,
      box: "border-green-500/25 bg-green-500/[0.06]",
      ico: "text-green-600 dark:text-green-300",
      lbl: "text-green-700 dark:text-green-300",
      chip: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300",
    },
    NORMAL: {
      label: t("dynNormal"),
      note: t("dynBannerNormal"),
      icon: Activity,
      box: "border-blue-500/25 bg-blue-500/[0.05]",
      ico: "text-blue-600 dark:text-blue-300",
      lbl: "text-blue-700 dark:text-blue-300",
      chip: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    },
    HIGH: {
      label: t("dynHigh"),
      note: t("dynBannerHigh"),
      icon: TrendingUp,
      box: "border-amber-500/30 bg-amber-500/[0.07]",
      ico: "text-amber-600 dark:text-amber-300",
      lbl: "text-amber-700 dark:text-amber-300",
      chip: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
  }[demand.tier];

  /** Non-BINUSIAN (guest): advance booking locked - walk-in only. */
  const initialType: ResType = defaultType === "ADVANCE" && !isBinusian ? "WALK_IN" : defaultType;
  const todayStr = dateStr(new Date());
  const [type, setType] = React.useState<ResType>(initialType);
  const [vehIdx, setVehIdx] = React.useState(0);
  // Walk-in is always for today - start on today's date when walk-in is preselected.
  const [win, setWin] = React.useState(() =>
    initialType === "WALK_IN" ? { ...globalWin, date: todayStr } : { ...globalWin }
  );
  const [busy, setBusy] = React.useState(false);

  /** Walk-in only works for today; a future date (e.g. "Besok") locks it, and vice versa. */
  const isTodayPicked = win.date === todayStr;
  const walkInLockedByDate = !isTodayPicked;
  const dateLockedByWalkIn = type === "WALK_IN";

  const fee = type === "ADVANCE" ? pricing.advanceFee : pricing.walkInFee;
  const enough = walletBalance >= fee;

  const durationH = React.useMemo(() => {
    const mins = toMinutes(win.endTime) - toMinutes(win.startTime);
    return mins / 60;
  }, [win]);

  function confirm() {
    if (!enough || busy) {
      if (!enough) toast(t("insufficient"), "error");
      return;
    }
    setBusy(true);
    const veh = vehicles[vehIdx];
    setTimeout(() => {
      const res = book({
        slotId,
        slotNumber,
        type,
        date: win.date,
        startTime: win.startTime,
        endTime: win.endTime,
        vehiclePlate: veh.licensePlate,
        vehicleName: `${veh.brand ?? ""} ${veh.model ?? ""}`.trim() || veh.nickname,
      });
      setBusy(false);
      if (res) {
        onDone(res.id);
      } else {
        toast(t("insufficient"), "error");
      }
    }, 700);
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 28 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      {/* header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label={t("back")}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/60 transition hover:border-primary/40"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div>
          <h2 className="font-display text-lg font-bold leading-tight tracking-tight">
            {t("bookSlot")}
          </h2>
          <p className="text-[11px] text-muted-foreground">{campus.location}</p>
        </div>
      </div>

      {/* slot hero */}
      <div className="glass relative overflow-hidden rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {lang === "id" ? "Slot terpilih" : "Selected slot"}
            </p>
            <p className="tnum mt-1.5 font-display text-5xl font-bold tracking-tight text-gradient-gold">
              {slotNumber}
            </p>
            {slotObj?.slotType === "EV" && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-green-400/40 bg-green-400/10 px-2.5 py-1 text-[10px] font-bold text-green-400">
                <Zap className="h-3 w-3" />
                {t("slotTypeEvBadge")}
              </span>
            )}
            {slotObj?.slotType === "DISABILITY" && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-blue-400/40 bg-blue-400/10 px-2.5 py-1 text-[10px] font-bold text-blue-400">
                <Accessibility className="h-3 w-3" />
                {t("slotTypeDisabilityBadge")}
              </span>
            )}
          </div>
          <div className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl border",
            slotObj?.slotType === "EV"
              ? "border-green-400/40 bg-green-400/10"
              : slotObj?.slotType === "DISABILITY"
              ? "border-blue-400/40 bg-blue-400/10"
              : "border-green-400/30 bg-green-400/10"
          )}>
            {slotObj?.slotType === "EV" ? (
              <Zap className="h-6 w-6 text-green-400" />
            ) : slotObj?.slotType === "DISABILITY" ? (
              <Accessibility className="h-6 w-6 text-blue-400" />
            ) : (
              <Car className="h-6 w-6 text-green-300" />
            )}
          </div>
        </div>
      </div>

      {/* dynamic pricing banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={cn("flex items-center gap-3 rounded-2xl border p-3.5", tierMeta.box)}
      >
        <tierMeta.icon className={cn("h-5 w-5 shrink-0", tierMeta.ico)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn("text-[12px] font-bold", tierMeta.lbl)}>
              {lang === "id" ? `Parkir ${tierMeta.label.toLowerCase()}` : `Parking is ${tierMeta.label.toLowerCase()}`}
            </span>
            <span className="tnum rounded-full bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {demand.pct}% {t("dynOccupiedPct")}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{tierMeta.note}</p>
        </div>
      </motion.div>

      {/* type */}
      <section className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">{t("bookType")}</p>
        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              { k: "ADVANCE", icon: Gauge, label: t("advance"), fee: pricing.advanceFee, ref: TARIFF.advanceFee, note: lang === "id" ? "Pesan untuk hari ini atau hari lain" : "Book for today or another day" },
              { k: "WALK_IN", icon: QrCode, label: t("walkIn"), fee: pricing.walkInFee, ref: TARIFF.walkInFee, note: lang === "id" ? "Hari ini saja, scan QR di slot" : "Today only, scan the slot QR" },
            ] as const
          ).map((o) => {
            const guestLocked = !isBinusian && o.k === "ADVANCE";
            const dateLocked = o.k === "WALK_IN" && walkInLockedByDate;
            const locked = guestLocked || dateLocked;
            const lockMsg = guestLocked
              ? t("binusianOnly")
              : lang === "id"
                ? "Hanya untuk hari ini"
                : "Today only";
            return (
              <button
                key={o.k}
                onClick={() => {
                  if (locked) {
                    toast(
                      guestLocked
                        ? t("binusianOnly")
                        : lang === "id"
                          ? `${t("walkIn")} hanya untuk hari ini. Ganti tanggal ke "Hari ini" dulu.`
                          : `${t("walkIn")} is for today only. Change the date to "Today" first.`,
                      "info"
                    );
                    return;
                  }
                  setType(o.k);
                }}
                aria-disabled={locked || undefined}
                className={cn(
                  "relative rounded-2xl border p-3.5 text-left transition-all",
                  locked && "cursor-not-allowed opacity-45 hover:border-border",
                  type === o.k && !locked
                    ? "border-primary/60 bg-primary/10 shadow-[0_0_24px_-8px_rgba(59,130,246,0.4)]"
                    : "border-border bg-card/50 hover:border-primary/25"
                )}
              >
                <o.icon className={cn("h-4.5 w-4.5", type === o.k && !locked ? "text-primary" : "text-muted-foreground")} />
                <p className="mt-2.5 flex items-center gap-1.5 text-sm font-bold">
                  {o.label}
                  {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                </p>
                <p className="tnum mt-0.5 flex flex-wrap items-baseline gap-1.5 text-xs font-semibold text-primary">
                  {o.fee !== o.ref && (
                    <span className="tnum text-[10px] font-medium text-muted-foreground line-through">
                      {rupiah(o.ref)}
                    </span>
                  )}
                  {rupiah(o.fee)}
                </p>
                <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                  {locked ? lockMsg : o.note}
                </p>
                {type === o.k && !locked && (
                  <ShieldCheck className="absolute right-3 top-3 h-4 w-4 text-primary" />
                )}
              </button>
            );
          })}
        </div>
        {!isBinusian && (
          <p className="flex items-start gap-2 rounded-xl border border-binus-bright/25 bg-binus-blue/25 px-3 py-2.5 text-[11px] leading-snug text-binus-bright">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t("guestBookingNote")}
          </p>
        )}
      </section>

      {/* vehicle */}
      <section className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">{t("chooseVehicle")}</p>
        <div className="space-y-2">
          {vehicles.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setVehIdx(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                vehIdx === i
                  ? "border-primary/50 bg-primary/[0.07]"
                  : "border-border bg-card/50 hover:border-primary/25"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl border",
                  vehIdx === i
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border bg-white/[0.03] text-muted-foreground"
                )}
              >
                <Car className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold leading-tight">{v.nickname}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {v.brand} {v.model} · {v.color}
                </span>
              </span>
              {/* Indonesian plate */}
              <span className="shrink-0 overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
                <span className="block bg-[#1e3a8a] px-1 pt-0.5 text-center text-[5px] font-bold leading-[7px] text-white">
                  BINUS
                </span>
                <span className="tnum block px-1.5 pb-0.5 text-center text-[11px] font-black leading-4 text-[#0b1226]">
                  {v.licensePlate}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* window */}
      <section className="glass space-y-3 rounded-3xl p-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold">
          <CalendarClock className="h-4 w-4 text-primary" /> {t("window")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <WindowPicker
            label={t("date")}
            display={fmtDateLabel(win.date, lang)}
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            disabled={dateLockedByWalkIn}
            onDisabledClick={() =>
              toast(
                lang === "id"
                  ? `${t("walkIn")} hanya untuk hari ini. Pilih "${t("advance")}" untuk pesan di hari lain.`
                  : `${t("walkIn")} is for today only. Choose "${t("advance")}" to book another day.`,
                "info"
              )
            }
          >
            {(close) => <DateGrid value={win.date} onPick={(d) => { setWin({ ...win, date: d }); close(); }} />}
          </WindowPicker>
          <WindowPicker label={t("startTime")} display={win.startTime} icon={<Clock className="h-3.5 w-3.5" />}>
            {(close) => (
              <TimeGrid
                value={win.startTime}
                onPick={(v) => {
                  const end = Math.min(toMinutes(v) + 120, TARIFF.closeHour * 60);
                  setWin({ ...win, startTime: v, endTime: fromMinutes(end) });
                  close();
                }}
              />
            )}
          </WindowPicker>
          <WindowPicker label={t("endTime")} display={win.endTime} icon={<Clock className="h-3.5 w-3.5" />}>
            {(close) => (
              <TimeGrid
                value={win.endTime}
                from={toMinutes(win.startTime) + 30}
                onPick={(v) => { setWin({ ...win, endTime: v }); close(); }}
              />
            )}
          </WindowPicker>
        </div>
        <p className="tnum text-right text-[10px] text-muted-foreground">
          {durationH.toFixed(1)} {lang === "id" ? "jam" : "hours"} · {t("overtimeNote")}
        </p>
        {dateLockedByWalkIn && (
          <p className="flex items-start gap-1.5 rounded-xl bg-muted/60 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
            <Lock className="mt-0.5 h-3 w-3 shrink-0" />
            {lang === "id"
              ? `${t("walkIn")} hanya untuk hari ini, jadi tanggal tidak bisa diganti.`
              : `${t("walkIn")} is for today only, so the date can't be changed.`}
          </p>
        )}
      </section>

      {/* summary + pay */}
      <section className="glass space-y-2.5 rounded-3xl p-4">
        <p className="text-xs font-semibold">{t("summary")}</p>
        <div className="space-y-1.5 text-[13px]">
          {[
            [lang === "id" ? "Slot" : "Slot", `${slotNumber} · ${type === "ADVANCE" ? t("advance") : t("walkIn")}`],
            [lang === "id" ? "Tanggal" : "Date", fmtDateLabel(win.date, lang)],
            [lang === "id" ? "Jam" : "Time", `${win.startTime} – ${win.endTime}`],
            [lang === "id" ? "Durasi" : "Duration", `${durationH.toFixed(1)} ${lang === "id" ? "jam" : "hours"}`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-muted-foreground">{k}</span>
              <span className="tnum font-semibold">{v}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-dashed border-border pt-1.5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {t("serviceFee")}
              {demand.tier !== "NORMAL" && (
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider",
                    tierMeta.chip
                  )}
                >
                  {tierMeta.label}
                </span>
              )}
            </span>
            <span className="tnum font-bold">{rupiah(fee)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" /> {t("walletBalance")}
            </span>
            <span className="tnum font-semibold">{rupiah(walletBalance)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-dashed border-border pt-1.5">
            <span className="text-muted-foreground">{t("balanceAfter")}</span>
            <span
              className={cn(
                "tnum font-bold",
                enough ? "text-green-400" : "text-red-400"
              )}
            >
              {rupiah(walletBalance - fee)}
            </span>
          </div>
        </div>
        {!enough && (
          <p className="rounded-xl bg-red-400/10 px-3 py-2 text-[11px] font-medium text-red-400">
            {t("insufficient")}
          </p>
        )}
        <p className="text-[10.5px] leading-snug text-muted-foreground">
          {lang === "id"
            ? `Bayar sekali ${rupiah(fee)} untuk ${durationH.toFixed(1)} jam. Keluar lewat ${win.endTime} kena denda ${rupiah(TARIFF.overtimeFeePerHour)}/jam.`
            : `One payment of ${rupiah(fee)} for ${durationH.toFixed(1)} hours. Leaving after ${win.endTime} costs ${rupiah(TARIFF.overtimeFeePerHour)}/hour.`}
        </p>
        <button
          onClick={confirm}
          disabled={busy || !enough}
          className={cn(
            "mt-1 flex h-13 w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-all",
            enough
              ? "glow-primary bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.98]"
              : "cursor-not-allowed bg-white/[0.05] text-muted-foreground"
          )}
        >
          {busy ? (
            <span className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
          ) : (
            <>
              {t("payAndBook")} · {rupiah(fee)}
            </>
          )}
        </button>
      </section>
    </motion.div>
  );
}

/**
 * BookingConfirmed - full-screen "pesanan berhasil" card shown right after paying,
 * so the user clearly sees what was booked and what to do next.
 */
export function BookingConfirmed({
  reservationId,
  onClose,
}: {
  reservationId: string | null;
  onClose: () => void;
}) {
  const lang = useParkir((s) => s.lang);
  const res = useParkir((s) => s.reservations.find((r) => r.id === reservationId));
  const walletBalance = useParkir((s) => s.walletBalance);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  if (!reservationId || !res) return null;

  const id = lang === "id";
  const durationH = (toMinutes(res.endTime) - toMinutes(res.startTime)) / 60;
  const rows: [string, string][] = [
    [id ? "Kode pesanan" : "Booking code", res.code],
    [id ? "Slot" : "Slot", `${res.slotNumber} · ${res.type === "ADVANCE" ? t("advance") : t("walkIn")}`],
    [id ? "Tanggal" : "Date", fmtDateLabel(res.date, lang)],
    [id ? "Jam" : "Time", `${res.startTime} – ${res.endTime} (${durationH.toFixed(1)} ${id ? "jam" : "h"})`],
    [id ? "Kendaraan" : "Vehicle", res.vehiclePlate],
    [id ? "Dibayar" : "Paid", rupiah(res.serviceFee)],
    [id ? "Sisa saldo" : "Balance left", rupiah(walletBalance)],
  ];
  const dLabel = fmtDateLabel(res.date, lang);
  const when = ["Hari ini", "Besok", "Today", "Tomorrow"].includes(dLabel)
    ? dLabel.toLowerCase()
    : id ? `tanggal ${dLabel}` : `on ${dLabel}`;
  const steps = id
    ? [
        `Datang ke slot ${res.slotNumber} ${when} jam ${res.startTime}.`,
        "Tekan tombol Scan QR, lalu scan QR di slot untuk check-in.",
        `Scan lagi saat pulang. Lewat jam ${res.endTime} kena denda ${rupiah(TARIFF.overtimeFeePerHour)}/jam.`,
      ]
    : [
        `Go to slot ${res.slotNumber} ${when} at ${res.startTime}.`,
        "Tap Scan QR and scan the code on the slot to check in.",
        `Scan again when leaving. After ${res.endTime} it's ${rupiah(TARIFF.overtimeFeePerHour)}/hour.`,
      ];

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={t("bookSuccess")}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="w-full max-w-[400px] rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-xl"
      >
        <div className="flex flex-col items-center text-center">
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 18 }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white"
          >
            <CheckCircle2 className="h-8 w-8" />
          </motion.span>
          <h2 className="mt-3 font-display text-lg font-bold">{t("bookSuccess")}</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {res.status === "CHECKED_IN"
              ? id ? "Kamu sudah check-in. Selamat parkir!" : "You're checked in. Happy parking!"
              : id ? "Slot kamu sudah aman. Status: menunggu check-in." : "Your slot is secured. Status: waiting for check-in."}
          </p>
        </div>

        <dl className="mt-4 space-y-1.5 rounded-2xl bg-muted/60 p-3.5 text-[13px]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="tnum text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-xs font-semibold">{id ? "Langkah selanjutnya" : "What's next"}</p>
        <ol className="mt-1.5 space-y-1.5">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-2 text-[12px] leading-snug text-muted-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>

        <button
          onClick={onClose}
          autoFocus
          className="mt-5 h-12 w-full rounded-2xl bg-primary text-sm font-bold text-primary-foreground transition active:scale-[0.98]"
        >
          {id ? "Lihat tiket" : "View ticket"}
        </button>
      </motion.div>
    </div>
  );
}
