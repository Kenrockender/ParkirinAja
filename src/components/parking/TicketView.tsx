"use client";
/** TicketView — premium boarding-pass parking pass with mock QR. */
import React from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  Car,
  Clock,
  Info,
  LogIn,
  QrCode,
  Ticket as TicketIcon,
  Timer,
  XCircle,
} from "lucide-react";
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
import { MockQR, ResStatusPill } from "./Brand";
import { useParkir } from "@/lib/store";
import {
  LOCATION,
  TARIFF,
  refundAmount,
  rupiah,
  tr,
} from "@/lib/parking-data";
import { cn } from "@/lib/utils";

export function TicketView({
  reservation,
  onBack,
  onUpdate,
  onOpenScanner,
}: {
  reservation: string;
  onBack: () => void;
  onUpdate: (r: import("@/lib/parking-data").Reservation) => void;
  onOpenScanner: () => void;
}) {
  const lang = useParkir((s) => s.lang);
  const res = useParkir((s) => s.reservations.find((r) => r.id === reservation));
  const cancelReservation = useParkir((s) => s.cancelReservation);
  const checkIn = useParkir((s) => s.checkIn);
  const toast = useParkir((s) => s.toast);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
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

      {/* ── the pass ── */}
      <div className="glow-soft overflow-hidden rounded-3xl border border-white/10 bg-[#0d1424] dark:bg-[#0d1424]">
        {/* top band */}
        <div className="relative overflow-hidden bg-primary px-5 py-3.5">
          <div aria-hidden className="absolute inset-0 opacity-[0.12]">
            <div className="absolute -left-4 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full border-[10px] border-primary-foreground" />
            <div className="absolute right-8 top-0 h-24 w-24 translate-x-6 rounded-full border-[12px] border-primary-foreground" />
          </div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TicketIcon className="h-4 w-4 text-primary-foreground" />
              <span className="font-display text-[13px] font-bold tracking-[0.22em] text-primary-foreground">
                {t("parkingPass")}
              </span>
            </div>
            <span className="tnum rounded-full bg-primary-foreground/20 px-2.5 py-0.5 text-[11px] font-black text-primary-foreground">
              {res.code}
            </span>
          </div>
        </div>

        {/* body */}
        <div className="px-5 pb-5 pt-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {LOCATION.name}
              </p>
              <p className="tnum mt-1 font-display text-[3.2rem] font-bold leading-none tracking-tight text-gradient-gold">
                {res.slotNumber}
              </p>
            </div>
            <div className="pb-1 text-right">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {t("vehicle")}
              </p>
              <p className="mt-1 text-xs font-bold">{res.vehicleName}</p>
              <p className="tnum text-[11px] text-muted-foreground">{res.vehiclePlate}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-white/[0.04] px-3 py-2.5">
              <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                <CalendarDays className="h-3 w-3" /> {t("date")}
              </p>
              <p className="mt-1 text-[13px] font-bold">{dateFmt}</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-3 py-2.5">
              <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3 w-3" /> {t("window")}
              </p>
              <p className="tnum mt-1 text-[13px] font-bold">
                {res.startTime} – {res.endTime}
              </p>
            </div>
          </div>

          {res.status === "CHECKED_IN" && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] px-3.5 py-2.5">
              <span className="flex h-8 w-8 animate-pulse-ring items-center justify-center rounded-full bg-emerald-400/20">
                <Timer className="h-4 w-4 text-emerald-300" />
              </span>
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">
                  {t("sessionActive")}
                </p>
                <p className="tnum text-sm font-bold text-emerald-300">
                  {elapsedH}h {String(elapsedM).padStart(2, "0")}m
                </p>
              </div>
            </div>
          )}

          {(res.status === "COMPLETED" || res.status === "CANCELLED") && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/[0.04] px-2 py-2">
                <p className="text-[9px] text-muted-foreground">{t("serviceFee")}</p>
                <p className="tnum text-xs font-bold">{rupiah(res.serviceFee)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] px-2 py-2">
                <p className="text-[9px] text-muted-foreground">{t("tParkingFee")}</p>
                <p className="tnum text-xs font-bold">{rupiah(res.parkingFee)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] px-2 py-2">
                <p className="text-[9px] text-muted-foreground">{res.refundAmount ? t("tRefund") : t("tOvertime")}</p>
                <p className="tnum text-xs font-bold">
                  {rupiah(res.refundAmount || res.overtimeFee)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* perforation */}
        <div className="relative px-5">
          <div className="ticket-perf border-t-2 border-dashed border-white/12" />
        </div>

        {/* QR section */}
        <div className="flex items-center gap-4 px-5 py-5">
          <MockQR seed={res.code} size={108} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-bold">
              <QrCode className="h-3.5 w-3.5 text-primary" />
              {lang === "id" ? "QR permanen di slot" : "Permanent QR at the slot"}
            </p>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
              {t("scanAtSlot")}
            </p>
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-[9.5px] font-semibold text-muted-foreground">
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
                  checkIn(res.id);
                  onUpdate(useParkir.getState().reservations.find((r) => r.id === res.id)!);
                  toast(t("checkinOk"), "success");
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
                  : "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              )}
            >
              <LogIn className="h-4.5 w-4.5" />
              {t("checkIn")}
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/25 bg-red-400/[0.06] py-3 text-sm font-semibold text-red-400 transition hover:bg-red-400/10"
            >
              <XCircle className="h-4 w-4" />
              {t("cancelBooking")}
            </button>
          </>
        )}

        {res.status === "CHECKED_IN" && (
          <button
            onClick={onOpenScanner}
            className="glow-primary flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all hover:scale-[1.01] active:scale-[0.98]"
          >
            <QrCode className="h-4.5 w-4.5" />
            {t("scanExit")}
          </button>
        )}

        {["COMPLETED", "CANCELLED", "NO_SHOW", "EXPIRED"].includes(res.status) && (
          <div className="glass flex items-center justify-between rounded-2xl px-4 py-3">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Car className="h-4 w-4" /> {t("sessionDone")}
            </span>
            <span className="tnum text-sm font-bold">
              {rupiah(res.serviceFee + res.parkingFee + res.overtimeFee - res.refundAmount)}
            </span>
          </div>
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
    </motion.div>
  );
}
