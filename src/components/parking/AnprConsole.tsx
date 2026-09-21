"use client";
/**
 * AnprConsole — simulated ANPR license-plate recognition panel for the operator.
 *
 * Flow:
 *  1. Operator uploads a plate photo (or uses manual text input fallback)
 *  2. 1.2s processing animation ("Menganalisis plat...")
 *  3. Deterministic OCR result: hashes filename+size → picks a plate from
 *     CONFIRMED reservations so demos are reproducible
 *  4. Shows plate, confidence bar, matched reservation card
 *  5. "Konfirmasi Check-in" → calls manualCheckIn() + appends ANPR_CHECKIN audit
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  ScanLine,
  Search,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { useParkir } from "@/lib/store";
import { tr } from "@/lib/parking-data";
import { cn } from "@/lib/utils";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Simple deterministic hash of a string → number 0..1 */
function strHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h / 0xffffffff;
}

/** Map hash → confidence in range [82, 97] */
function hashToConfidence(h: number): number {
  return Math.round(82 + h * 15);
}

// ─── component ───────────────────────────────────────────────────────────────

type Stage = "idle" | "processing" | "result" | "no-match";

export function AnprConsole({ className }: { className?: string }) {
  const lang = useParkir((s) => s.lang);
  const reservations = useParkir((s) => s.reservations);
  const slots = useParkir((s) => s.slots);
  const manualCheckIn = useParkir((s) => s.manualCheckIn);
  const toast = useParkir((s) => s.toast);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);

  const [expanded, setExpanded] = React.useState(false);
  const [stage, setStage] = React.useState<Stage>("idle");
  const [preview, setPreview] = React.useState<string | null>(null);
  const [detectedPlate, setDetectedPlate] = React.useState("");
  const [confidence, setConfidence] = React.useState(0);
  const [manualInput, setManualInput] = React.useState("");

  const fileRef = React.useRef<HTMLInputElement>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only CONFIRMED reservations for this campus are candidates
  const confirmed = React.useMemo(
    () => reservations.filter((r) => r.status === "CONFIRMED" && slots.some((s) => s.id === r.slotId)),
    [reservations, slots]
  );

  const matchedRes = React.useMemo(
    () => reservations.find((r) => r.vehiclePlate === detectedPlate),
    [reservations, detectedPlate]
  );

  function reset() {
    setStage("idle");
    setPreview(null);
    setDetectedPlate("");
    setConfidence(0);
    setManualInput("");
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  function runDetection(plate: string, conf: number) {
    setDetectedPlate(plate);
    setConfidence(conf);
    setStage("processing");
    timerRef.current = setTimeout(() => {
      const match = reservations.find((r) => r.vehiclePlate === plate);
      setStage(match ? "result" : "no-match");
    }, 1200);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Deterministic "OCR": hash filename+size → pick plate from confirmed reservations
    const h = strHash(`${file.name}-${file.size}`);
    const conf = hashToConfidence(h);

    let plate: string;
    if (confirmed.length > 0) {
      const idx = Math.floor(h * confirmed.length);
      plate = confirmed[idx].vehiclePlate;
    } else {
      // Fallback: generate a plausible-looking plate
      const letters = ["B", "D", "F", "L", "N"];
      const li = Math.floor(h * letters.length);
      const num = 1000 + Math.floor(h * 8999);
      const suffix = ["ABC", "XYZ", "QR", "ST", "UV"][Math.floor(h * 5)];
      plate = `${letters[li]} ${num} ${suffix}`;
    }

    runDetection(plate, conf);
  }

  function onManualSearch() {
    const plate = manualInput.trim().toUpperCase();
    if (!plate) return;
    runDetection(plate, 100);
  }

  function onConfirmCheckin() {
    if (!matchedRes) return;
    const ok = manualCheckIn(matchedRes.id);
    toast(ok ? t("anprCheckinOk") : t("anprCheckinFail"), ok ? "success" : "error");
    if (ok) reset();
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("glass rounded-3xl", className)}
    >
      {/* header — click to expand/collapse */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2.5 p-4 text-left"
        aria-expanded={expanded}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <ScanLine className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold tracking-tight">{t("anprTitle")}</p>
          <p className="truncate text-[10px] text-muted-foreground">{t("anprSub")}</p>
        </div>
        <span className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* expandable body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="anpr-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-4 pb-4">
              <div className="h-px bg-border/60" />

              {/* ── upload section ── */}
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("anprUploadTitle")}
                </p>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  className="hidden"
                  aria-hidden
                />

                {/* upload trigger or preview */}
                {preview ? (
                  <div className="relative overflow-hidden rounded-xl border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Plate preview"
                      className="h-28 w-full object-cover"
                    />
                    <button
                      onClick={reset}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
                      aria-label="Remove photo"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 text-muted-foreground transition hover:border-primary/40 hover:bg-primary/[0.04] active:scale-[0.99]"
                  >
                    <Upload className="h-5 w-5" />
                    <span className="text-[11px] font-semibold">{t("anprUploadPrompt")}</span>
                    <span className="text-[10px]">{t("anprUploadHint")}</span>
                  </button>
                )}
              </div>

              {/* ── processing state ── */}
              <AnimatePresence mode="wait">
                {stage === "processing" && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.05] px-3.5 py-3">
                      <Loader2 className="h-4.5 w-4.5 shrink-0 animate-spin text-primary" />
                      <p className="text-[12px] font-semibold">{t("anprAnalyzing")}</p>
                    </div>
                    {/* animated progress bar */}
                    <div className="h-1.5 overflow-hidden rounded-full bg-border">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1.2, ease: "easeInOut" }}
                      />
                    </div>
                  </motion.div>
                )}

                {(stage === "result" || stage === "no-match") && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2.5"
                  >
                    {/* detected plate */}
                    <div className="rounded-2xl border border-border bg-card/60 p-3">
                      <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {t("anprDetected")}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between gap-3">
                        {/* plate render */}
                        <span className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
                          <span className="block bg-[#1e3a8a] px-1 pt-0.5 text-center text-[5px] font-bold leading-[7px] text-white">
                            ID
                          </span>
                          <span className="tnum block px-2 pb-0.5 text-center text-[13px] font-black leading-5 text-[#0b1226]">
                            {detectedPlate}
                          </span>
                        </span>
                        {/* confidence */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-[9.5px] font-semibold text-muted-foreground">
                              {t("anprConfidence")}
                            </p>
                            <p className={cn(
                              "tnum text-[11px] font-black",
                              confidence >= 90 ? "text-emerald-400" : confidence >= 80 ? "text-amber-400" : "text-red-400"
                            )}>
                              {confidence}%
                            </p>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                            <motion.div
                              className={cn(
                                "h-full rounded-full",
                                confidence >= 90 ? "bg-emerald-400" : confidence >= 80 ? "bg-amber-400" : "bg-red-400"
                              )}
                              initial={{ width: 0 }}
                              animate={{ width: `${confidence}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* matched reservation */}
                    {stage === "result" && matchedRes ? (
                      <div className="space-y-2">
                        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] p-3">
                          <p className="mb-1.5 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t("anprMatchFound")}
                          </p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                            <div>
                              <p className="text-[9px] text-muted-foreground">{lang === "id" ? "Pengemudi" : "Driver"}</p>
                              <p className="font-bold">{matchedRes.driverName}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-muted-foreground">{lang === "id" ? "Slot" : "Slot"}</p>
                              <p className="tnum font-bold">{matchedRes.slotNumber}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-muted-foreground">{lang === "id" ? "Jadwal" : "Window"}</p>
                              <p className="tnum font-bold">{matchedRes.startTime} – {matchedRes.endTime}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-muted-foreground">{lang === "id" ? "Tanggal" : "Date"}</p>
                              <p className="tnum font-bold">{matchedRes.date}</p>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={onConfirmCheckin}
                          className="glow-primary flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black text-primary-foreground transition active:scale-[0.98]"
                        >
                          <ShieldCheck className="h-4.5 w-4.5" />
                          {t("anprConfirmCheckin")}
                        </button>
                        <button
                          onClick={reset}
                          className="flex w-full items-center justify-center text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
                        >
                          {lang === "id" ? "Coba lagi" : "Try again"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5 rounded-xl border border-red-400/25 bg-red-400/[0.06] px-3 py-2.5">
                          <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                          <p className="text-[11px] font-semibold text-red-400">{t("anprMatchNone")}</p>
                        </div>
                        <button
                          onClick={reset}
                          className="flex w-full items-center justify-center text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
                        >
                          {lang === "id" ? "Coba lagi" : "Try again"}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── manual fallback ── */}
              {stage === "idle" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-1.5"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("anprManualLabel")}
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && onManualSearch()}
                      placeholder={t("anprManualPh")}
                      className="tnum h-10 flex-1 rounded-xl border border-border bg-card/50 px-3.5 text-[12px] font-bold tracking-wider placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground/40 focus:border-primary/50 focus:outline-none"
                    />
                    <button
                      onClick={onManualSearch}
                      disabled={!manualInput.trim()}
                      className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-black text-primary-foreground transition active:scale-95 disabled:opacity-40"
                    >
                      <Search className="h-3.5 w-3.5" />
                      {t("anprManualBtn")}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
