"use client";
/** ScannerView — simulated camera overlay with scan frame, slot picker & manual code. */
import React from "react";
import { motion } from "framer-motion";
import { QrCode, ScanLine, X } from "lucide-react";
import { useParkir } from "@/lib/store";
import { slotStatusForWindow, tr, type Slot } from "@/lib/parking-data";
import { cn } from "@/lib/utils";

export function ScannerView({
  open,
  onClose,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  onResult: (kind: "walkin" | "checkin" | "checkout", resId?: string) => void;
}) {
  const lang = useParkir((s) => s.lang);
  const slots = useParkir((s) => s.slots);
  const reservations = useParkir((s) => s.reservations);
  const win = useParkir((s) => s.viewWindow);
  const scanSlot = useParkir((s) => s.scanSlot);
  const toast = useParkir((s) => s.toast);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const [code, setCode] = React.useState("");
  const [flash, setFlash] = React.useState<string | null>(null);

  const free = slots.filter(
    (s) => slotStatusForWindow(s, reservations, win) === "AVAILABLE"
  );
  const mine = reservations.filter((r) => ["CONFIRMED", "CHECKED_IN"].includes(r.status));

  if (!open) return null;

  function handleScan(slotNumber: string) {
    const res = scanSlot(slotNumber);
    if (res.ok) {
      setFlash(slotNumber);
      setTimeout(() => {
        setFlash(null);
        onResult(res.kind, res.reservation?.id);
      }, 850);
    } else {
      const msg =
        res.reason === "unknown"
          ? t("badCode")
          : res.reason === "busy"
            ? t("slotBusy")
            : res.reason === "insufficient"
              ? t("insufficient")
              : res.reason === "max_active"
                ? t("maxActiveToast")
                : t("scanDenied");
      toast(msg, "error");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#04060d]"
    >
      {/* simulated camera feed */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(30,58,138,0.22),transparent_65%)]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 4px)",
          }}
        />
      </div>

      {/* top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pb-2 pt-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary glow-primary">
            <QrCode className="h-4.5 w-4.5 text-primary-foreground" />
          </span>
          <div>
            <p className="font-display text-sm font-bold leading-tight">{t("scannerTitle")}</p>
            <p className="text-[10px] text-white/50">{t("scannerHint")}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label={t("close")}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white backdrop-blur transition hover:bg-white/10"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* scan frame */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-8">
        <div className="relative aspect-square w-full max-w-[280px]">
          {/* corners */}
          {[
            "left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-2xl",
            "right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-2xl",
            "left-0 bottom-0 border-l-[3px] border-b-[3px] rounded-bl-2xl",
            "right-0 bottom-0 border-r-[3px] border-b-[3px] rounded-br-2xl",
          ].map((c) => (
            <span key={c} className={cn("absolute h-10 w-10 border-primary", c)} />
          ))}
          {/* scanline */}
          <div className="absolute inset-3 overflow-hidden rounded-xl">
            <div className="animate-scanline absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_16px_rgba(255,214,10,0.8)]" />
          </div>
          {/* flash */}
          {flash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.85 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-primary/15 backdrop-blur-[2px]"
            >
              <ScanLine className="h-10 w-10 text-primary" />
              <p className="tnum font-display text-2xl font-bold text-primary">{flash}</p>
            </motion.div>
          )}
          {!flash && (
            <p className="absolute -bottom-9 left-0 right-0 text-center text-[11px] text-white/40">
              {t("scannerHint")}
            </p>
          )}
        </div>
      </div>

      {/* bottom sheet */}
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-h-[52dvh] overflow-y-auto slim-scroll rounded-t-[2rem] border-t border-white/10 bg-[#0a0f1e]/95 px-4 pb-8 pt-4 backdrop-blur-xl"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />

        {/* manual code */}
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter" && code.trim()) {
                handleScan(code.trim());
                setCode("");
              }
            }}
            placeholder={t("codePlaceholder")}
            aria-label={t("orEnterCode")}
            className="tnum h-11 flex-1 rounded-xl border border-white/15 bg-white/[0.05] px-4 text-sm font-bold tracking-wider placeholder:font-normal placeholder:tracking-normal placeholder:text-white/30 focus:border-primary/50 focus:outline-none"
          />
          <button
            onClick={() => {
              if (code.trim()) {
                handleScan(code.trim());
                setCode("");
              }
            }}
            className="glow-primary h-11 shrink-0 rounded-xl bg-primary px-5 text-xs font-black text-primary-foreground transition active:scale-95"
          >
            {t("scanGo")}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[9.5px] text-white/35">{t("orEnterCode")}</p>

        {/* my sessions — quick scan out */}
        {mine.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
              {lang === "id" ? "Sesi saya" : "My sessions"}
            </p>
            <div className="flex flex-wrap gap-2">
              {mine.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleScan(r.slotNumber)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition active:scale-95",
                    r.status === "CHECKED_IN"
                      ? "border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/15"
                      : "border-primary/25 bg-primary/[0.08] hover:bg-primary/15"
                  )}
                >
                  <span className="tnum font-display text-sm font-bold">{r.slotNumber}</span>
                  <span className="text-[9px] font-semibold text-white/50">
                    {r.status === "CHECKED_IN" ? t("scanExit") : t("checkIn")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* free slots */}
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
            {t("scanPick")}
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {free.map((s: Slot) => (
              <button
                key={s.id}
                onClick={() => handleScan(s.slotNumber)}
                className="tnum rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] py-2 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-400/15 active:scale-95"
              >
                {s.slotNumber}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
