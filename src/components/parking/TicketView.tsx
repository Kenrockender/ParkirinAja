"use client";
/**
 * TicketView - bright ivory boarding-pass parking pass (v25) with the
 * v22 no-parking-fee checkout flow and the v26 ending-soon banner.
 */
import React from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock,
  FileDown,
  Info,
  LogIn,
  LogOut,
  Navigation,
  Ticket as TicketIcon,
  Timer,
  TimerReset,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { WayfindingView } from "./WayfindingView";
import { generateReceipt } from "@/lib/invoice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { QRCodeSVG } from "qrcode.react";
import { ResStatusPill } from "./Brand";
import { useParkir } from "@/lib/store";
import {
  campusById,
  campusForSlot,
  TARIFF,
  overtimeFee,
  refundAmount,
  rupiah,
  tr,
} from "@/lib/parking-data";
import { cn } from "@/lib/utils";

export function TicketView({
  reservation,
  onBack,
  onUpdate,
}: {
  reservation: string;
  onBack: () => void;
  onUpdate: (r: import("@/lib/parking-data").Reservation) => void;
}) {
  const lang = useParkir((s) => s.lang);
  const res = useParkir((s) => s.reservations.find((r) => r.id === reservation));
  const cancelReservation = useParkir((s) => s.cancelReservation);
  const checkIn = useParkir((s) => s.checkIn);
  const checkOut = useParkir((s) => s.checkOut);
  const extendSession = useParkir((s) => s.extendSession);
  const user = useParkir((s) => s.user);
  const toast = useParkir((s) => s.toast);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [wayfindOpen, setWayfindOpen] = React.useState(false);
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [, tickNow] = React.useReducer((x: number) => x + 1, 0);

  // live elapsed timer for active sessions
  React.useEffect(() => {
    if (!res || res.status !== "CHECKED_IN") return;
    const id = setInterval(tickNow, 1000);
    return () => clearInterval(id);
  }, [res?.status]);

  if (!res) return null;

  const now = Date.now();
  const startMs = new Date(`${res.date}T${res.startTime}:00`).getTime();
  const canCheckIn =
    res.status === "CONFIRMED" && now >= startMs - 30 * 60_000; // 30min early allowed
  const estimatedRefund = refundAmount(res.serviceFee, startMs, now, res.createdAt);

  const elapsedMs =
    res.status === "CHECKED_IN" ? now - (res.checkedInAt ?? now) : 0;
  const elapsedH = Math.floor(elapsedMs / 3600_000);
  const elapsedM = Math.floor((elapsedMs % 3600_000) / 60_000);

  // v22 - the ONLY exit charge is the late fine
  const plannedEnd = new Date(`${res.date}T${res.endTime}:00`).getTime();
  const estLateMin = Math.max(0, Math.round((now - plannedEnd) / 60_000));
  const estOvertime = overtimeFee(estLateMin);
  const minsLeft = Math.round((plannedEnd - now) / 60_000);
  const endingSoon = res.status === "CHECKED_IN" && minsLeft > 0 && minsLeft <= 30;

  const dateFmt = new Date(`${res.date}T00:00:00`).toLocaleDateString(
    lang === "id" ? "id-ID" : "en-US",
    { weekday: "short", day: "numeric", month: "short" }
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 18 }}
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
        <h2 className="font-display text-lg font-bold tracking-tight">
          {lang === "id" ? "Tiket Parkir" : "Parking Ticket"}
        </h2>
        <ResStatusPill status={res.status} />
      </div>

      {/* v26 - ending-soon banner with quick extend */}
      {endingSoon && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          data-endsoon-banner
          className="flex items-center gap-3 rounded-2xl border border-amber-400/50 bg-gradient-to-r from-amber-400/[0.16] to-amber-400/[0.05] px-4 py-3.5"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20">
            <TriangleAlert className="h-5 w-5 animate-pulse text-amber-500 dark:text-amber-300" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-black leading-tight text-amber-600 dark:text-amber-300">
              {t("endSoonTitle")} · {minsLeft}m
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-amber-700/80 dark:text-amber-200/70">
              {t("endSoonBody").replace("{slot}", res.slotNumber).replace("{minutes}", String(minsLeft))}
            </p>
          </div>
          <button
            onClick={() => {
              const ok = extendSession(res.id, 1);
              toast(ok ? t("extendOk") : t("extendFail"), ok ? "success" : "error");
              if (ok) onUpdate(useParkir.getState().reservations.find((r) => r.id === res.id)!);
            }}
            data-endsoon-extend
            className="glow-primary flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-black text-primary-foreground transition active:scale-95"
          >
            <TimerReset className="h-4 w-4" />
            {t("extendBtn")}
          </button>
        </motion.div>
      )}

      {/* ── the ivory pass (v25) - bright in BOTH themes ── */}
      <div
        data-ticket-pass
        className="glow-soft overflow-hidden rounded-3xl border border-[#e7ddc0] bg-[#faf6e9] text-[#171310] shadow-[0_24px_60px_-28px_rgba(23,19,16,0.5)]"
      >
        {/* top band - ink navy */}
        <div className="relative overflow-hidden bg-[#0F172A] px-5 py-3.5">
          <div aria-hidden className="absolute inset-0 opacity-[0.1]">
            <div className="absolute -left-4 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full border-[10px] border-[#3B82F6]" />
            <div className="absolute right-8 top-0 h-24 w-24 translate-x-6 rounded-full border-[12px] border-[#3B82F6]" />
          </div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TicketIcon className="h-4 w-4 text-[#3B82F6]" />
              <span className="font-display text-[13px] font-bold tracking-[0.22em] text-[#faf6e9]">
                {t("parkingPass")}
              </span>
            </div>
            <span className="tnum rounded-full bg-[#3B82F6] px-2.5 py-0.5 text-[11px] font-black text-white">
              {res.code}
            </span>
          </div>
        </div>

        {/* body */}
        <div className="px-5 pb-5 pt-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8a7a55]">
                {campusById(campusForSlot(res.slotId)).location}
              </p>
              <p className="tnum mt-1 bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] bg-clip-text font-display text-[3.2rem] font-bold leading-none tracking-tight text-transparent">
                {res.slotNumber}
              </p>
            </div>
            <div className="pb-1 text-right">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8a7a55]">
                {t("vehicle")}
              </p>
              <p className="mt-1 text-xs font-bold text-[#171310]">{res.vehicleName}</p>
              <p className="tnum text-[11px] font-semibold text-[#4b3f2d]">{res.vehiclePlate}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-[#e7ddc0] bg-white/70 px-3 py-2.5">
              <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-[#8a7a55]">
                <CalendarDays className="h-3 w-3" /> {t("date")}
              </p>
              <p className="mt-1 text-[13px] font-bold text-[#171310]">{dateFmt}</p>
            </div>
            <div className="rounded-xl border border-[#e7ddc0] bg-white/70 px-3 py-2.5">
              <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-[#8a7a55]">
                <Clock className="h-3 w-3" /> {t("window")}
              </p>
              <p className="tnum mt-1 text-[13px] font-bold text-[#171310]">
                {res.startTime} – {res.endTime}
              </p>
            </div>
          </div>

          {res.status === "CHECKED_IN" && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-green-300 bg-green-50 px-3.5 py-2.5">
              <span className="flex h-8 w-8 animate-pulse-ring items-center justify-center rounded-full bg-green-200">
                <Timer className="h-4 w-4 text-green-700" />
              </span>
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700/80">
                  {t("sessionActive")}
                </p>
                <p className="tnum text-sm font-bold text-green-700">
                  {elapsedH}h {String(elapsedM).padStart(2, "0")}m
                  {endingSoon && (
                    <span className="ml-2 font-black text-amber-600">
                      · −{minsLeft}m
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {(res.status === "COMPLETED" || res.status === "CANCELLED") && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl border border-[#e7ddc0] bg-white/70 px-2 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#8a7a55]">{t("serviceFee")}</p>
                <p className="tnum text-xs font-bold text-[#171310]">{rupiah(res.serviceFee)}</p>
              </div>
              <div className="rounded-xl border border-[#e7ddc0] bg-white/70 px-2 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#8a7a55]">
                  {res.refundAmount ? t("tRefund") : t("tOvertime")}
                </p>
                <p className="tnum text-xs font-bold text-[#171310]">
                  {rupiah(res.refundAmount || res.overtimeFee)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* perforation - dark dots on ivory */}
        <div className="relative px-5">
          <div className="ticket-perf-dark border-t-2 border-dashed border-[#d8c9a3]" />
        </div>

        {/* QR section - real QR encoding the reservation code */}
        <div className="flex items-center gap-4 px-5 py-5">
          <span className="shrink-0 rounded-lg bg-white p-2.5 shadow-md ring-1 ring-[#e7ddc0]">
            <QRCodeSVG
              value={res.code}
              size={104}
              bgColor="#ffffff"
              fgColor="#0b1226"
              level="M"
              marginSize={2}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-bold text-[#171310]">
              <BadgeCheck className="h-3.5 w-3.5 text-[#1e3a8a]" />
              {t("passTitle")}
            </p>
            <p className="mt-1.5 text-[11px] leading-snug text-[#4b3f2d]">
              {t("showPass")}
            </p>
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#0b1226]/[0.06] px-2 py-0.5 text-[9.5px] font-semibold text-[#4b3f2d]">
              <Info className="h-3 w-3" /> {t("overtimeNote")}
            </p>
          </div>
        </div>
      </div>

      {/* actions */}
      <div className="space-y-2.5">
        {res.status === "CONFIRMED" && (
          <>
            <button
              onClick={() => {
                if (canCheckIn) {
                  const ok = checkIn(res.id);
                  if (ok) {
                    onUpdate(useParkir.getState().reservations.find((r) => r.id === res.id)!);
                    toast(t("checkinOk"), "success");
                  } else {
                    toast(t("maxActiveToast"), "error");
                  }
                } else {
                  toast(
                    lang === "id"
                      ? "Check-in dibuka 30 menit sebelum jadwal"
                      : "Check-in opens 30 minutes before your slot",
                    "info"
                  );
                }
              }}
              className={cn(
                "flex h-13 w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-all",
                canCheckIn
                  ? "glow-primary bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.98]"
                  : "border border-green-400/30 bg-green-400/10 text-green-600 dark:text-green-300"
              )}
            >
              <LogIn className="h-4.5 w-4.5" />
              {t("checkIn")}
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/25 bg-red-400/[0.06] py-3 text-sm font-semibold text-red-500 dark:text-red-400 transition hover:bg-red-400/10"
            >
              <XCircle className="h-4 w-4" />
              {t("cancelBooking")}
            </button>
            <button
              onClick={() => setWayfindOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-primary/[0.06] py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
              <Navigation className="h-4 w-4" />
              {t("wayfindOpen")}
            </button>
          </>
        )}

        {res.status === "CHECKED_IN" && (
          <>
            <button
              onClick={() => setCheckoutOpen(true)}
              className="glow-primary flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all hover:scale-[1.01] active:scale-[0.98]"
            >
              <LogOut className="h-4.5 w-4.5" />
              {t("checkOutBtn")}
            </button>
            {res.driverName === user.name && (
              <div>
                <button
                  onClick={() => {
                    const ok = extendSession(res.id, 1);
                    toast(
                      ok
                        ? `${t("extendOk")} - ${
                            useParkir.getState().reservations.find((r) => r.id === res.id)?.endTime ?? res.endTime
                          }`
                        : t("extendFail"),
                      ok ? "success" : "error"
                    );
                    if (ok) onUpdate(useParkir.getState().reservations.find((r) => r.id === res.id)!);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-400/25 bg-blue-400/[0.06] py-3 text-sm font-semibold text-blue-500 dark:text-blue-400 transition hover:bg-blue-400/10"
                >
                  <TimerReset className="h-4 w-4" />
                  {t("extendBtn")}
                </button>
                <p className="mt-1.5 text-center text-[10px] leading-snug text-muted-foreground">
                  {t("extendHint")}
                </p>
              </div>
            )}
            <button
              onClick={() => setWayfindOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-primary/[0.06] py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
              <Navigation className="h-4 w-4" />
              {t("wayfindOpen")}
            </button>
          </>
        )}

        {["COMPLETED", "CANCELLED", "NO_SHOW", "EXPIRED"].includes(res.status) && (
          <div className="glass flex items-center justify-between rounded-2xl px-4 py-3">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Car className="h-4 w-4" /> {t("sessionDone")}
            </span>
            <span className="tnum text-sm font-bold">
              {rupiah(res.serviceFee + res.overtimeFee - res.refundAmount)}
            </span>
          </div>
        )}

        {res.status === "COMPLETED" && (
          <button
            onClick={async () => {
              setPdfLoading(true);
              try {
                const campus = campusById(campusForSlot(res.slotId));
                await generateReceipt(res, campus, lang);
                toast(t("receiptReady"), "success");
              } finally {
                setPdfLoading(false);
              }
            }}
            disabled={pdfLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-primary/[0.06] py-3 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
          >
            <FileDown className={cn("h-4 w-4", pdfLoading && "animate-bounce")} />
            {pdfLoading ? (lang === "id" ? "Membuat PDF..." : "Generating PDF...") : t("downloadReceipt")}
          </button>
        )}
      </div>

      {/* cancel dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-3xl border-border bg-popover/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display tracking-tight">
              {t("cancelConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {t("cancelConfirmDesc")}
            </AlertDialogDescription>
            <div className="mt-1 flex items-center justify-between rounded-xl bg-primary/[0.08] px-3.5 py-2.5">
              <span className="text-xs font-semibold text-muted-foreground">{t("refundYouGet")}</span>
              <span className="tnum font-display text-lg font-bold text-primary">
                {rupiah(estimatedRefund)}
              </span>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-border bg-card/60 hover:bg-accent/60">
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                cancelReservation(res.id);
                toast(
                  `${t("stCancelled")} · ${t("refundYouGet")} ${rupiah(estimatedRefund)}`,
                  "success"
                );
                onBack();
              }}
              className="rounded-xl bg-red-500 text-white hover:bg-red-600"
            >
              {t("cancelBooking")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* check-out dialog - v22: fine row only when late, green note when on time */}
      <AlertDialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <AlertDialogContent className="rounded-3xl border-border bg-popover/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display tracking-tight">
              {t("checkoutConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {t("checkoutConfirmDesc")}
            </AlertDialogDescription>
            {estOvertime > 0 ? (
              <div className="mt-1 space-y-1.5 rounded-xl bg-primary/[0.08] px-3.5 py-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("estOvertime")}</span>
                  <span className="tnum font-bold">{rupiah(estOvertime)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between border-t border-dashed border-border pt-2">
                  <span className="text-xs font-semibold">{t("totalDue")}</span>
                  <span className="tnum font-display text-lg font-bold text-primary">
                    {rupiah(estOvertime)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-green-400/30 bg-green-400/[0.08] px-3.5 py-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500 dark:text-green-400" />
                <p className="text-xs font-bold text-green-600 dark:text-green-300">
                  {t("onTimeFree")}
                </p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-border bg-card/60 hover:bg-accent/60">
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const out = checkOut(res.id, "ticket");
                if (!out.ok) {
                  toast(t("insufficient"), "error");
                  return;
                }
                toast(
                  out.overtimeFee > 0
                    ? `${t("checkoutOk")} · ${t("tOvertime")} ${rupiah(out.overtimeFee)}`
                    : `${t("checkoutOk")} · ${t("onTimeFree")}`,
                  "success"
                );
              }}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t("checkOutBtn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* wayfinding dialog */}
      <WayfindingView
        open={wayfindOpen}
        onClose={() => setWayfindOpen(false)}
        reservation={res}
      />
    </motion.div>
  );
}
