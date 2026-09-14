"use client";
/** BookingView — pick type, vehicle & window, then pay from wallet. */
import React from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Car,
  Clock,
  Gauge,
  QrCode,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { DateGrid, TimeGrid, WindowPicker, fmtDateLabel } from "./WindowPickers";
import { useParkir } from "@/lib/store";
import {
  LOCATION,
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
  const book = useParkir((s) => s.book);
  const toast = useParkir((s) => s.toast);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);

  const [type, setType] = React.useState<ResType>(defaultType);
  const [vehIdx, setVehIdx] = React.useState(0);
  const [win, setWin] = React.useState({ ...globalWin });
  const [busy, setBusy] = React.useState(false);

  const fee = type === "ADVANCE" ? TARIFF.advanceFee : TARIFF.walkInFee;
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
        toast(`${t("bookSuccess")} · ${res.code}`, "success");
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
          <p className="text-[11px] text-muted-foreground">{LOCATION.name}</p>
        </div>
      </div>

      {/* slot hero */}
      <div className="glass glow-soft relative overflow-hidden rounded-3xl p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl"
        />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {lang === "id" ? "Slot terpilih" : "Selected slot"}
            </p>
            <p className="tnum mt-1.5 font-display text-5xl font-bold tracking-tight text-gradient-gold">
              {slotNumber}
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10">
            <Car className="h-6 w-6 text-emerald-300" />
          </div>
        </div>
      </div>

      {/* type */}
      <section className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">{t("bookType")}</p>
        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              { k: "ADVANCE", icon: Gauge, label: t("advance"), fee: TARIFF.advanceFee, note: lang === "id" ? "Pilih slot lebih dulu" : "Pick your slot early" },
              { k: "WALK_IN", icon: QrCode, label: t("walkIn"), fee: TARIFF.walkInFee, note: lang === "id" ? "Langsung via scan QR" : "Instant via QR scan" },
            ] as const
          ).map((o) => (
            <button
              key={o.k}
              onClick={() => setType(o.k)}
              className={cn(
                "relative rounded-2xl border p-3.5 text-left transition-all",
                type === o.k
                  ? "border-primary/60 bg-primary/10 shadow-[0_0_24px_-8px_rgba(255,214,10,0.4)]"
                  : "border-border bg-card/50 hover:border-primary/25"
              )}
            >
              <o.icon className={cn("h-4.5 w-4.5", type === o.k ? "text-primary" : "text-muted-foreground")} />
              <p className="mt-2.5 text-sm font-bold">{o.label}</p>
              <p className="tnum mt-0.5 text-xs font-semibold text-primary">{rupiah(o.fee)}</p>
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{o.note}</p>
              {type === o.k && (
                <ShieldCheck className="absolute right-3 top-3 h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
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
          <WindowPicker label={t("date")} display={fmtDateLabel(win.date, lang)} icon={<CalendarDays className="h-3.5 w-3.5" />}>
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
      </section>

      {/* summary + pay */}
      <section className="glass space-y-2.5 rounded-3xl p-4">
        <p className="text-xs font-semibold">{t("summary")}</p>
        <div className="space-y-1.5 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("serviceFee")}</span>
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
                enough ? "text-emerald-400" : "text-red-400"
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
