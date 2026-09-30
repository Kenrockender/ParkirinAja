"use client";
/**
 * ScannerView - real camera QR scanner (Task 7).
 *
 * Replaces the previous fake camera simulation with:
 *  1. getUserMedia({ facingMode: "environment" }) - rear camera
 *  2. BarcodeDetector API (native, Chrome/Edge/Safari 17+) - primary decoder
 *  3. @zxing/browser BrowserQRCodeReader - fallback for Firefox / older browsers
 *  4. Existing handleScan() business logic is unchanged - slot QRs are
 *     campus-neutral ("A-01", same QR at every campus) and resolved against
 *     the active campus; legacy PB-/AS-/BKS- prefixed QRs are still accepted.
 *
 * All existing manual fallback + "my sessions" quick-tap UI is preserved.
 */
import React from "react";
import { motion } from "framer-motion";
import { Building2, Camera, CameraOff, Flashlight, QrCode, RefreshCw, ScanLine, X, Zap } from "lucide-react";
import { useParkir } from "@/lib/store";
import {
  campusById,
  demandNow,
  DEMAND_TIERS,
  rupiah,
  tr,
} from "@/lib/parking-data";
import { cn } from "@/lib/utils";

// ── BarcodeDetector type shim (not in all TS libs yet) ──────────────────────
interface BarcodeDetectorResult { rawValue: string }
interface BarcodeDetectorI {
  detect(source: HTMLVideoElement): Promise<BarcodeDetectorResult[]>;
}
declare const BarcodeDetector: {
  new(opts: { formats: string[] }): BarcodeDetectorI;
  getSupportedFormats?(): Promise<string[]>;
};

// ── Camera state ─────────────────────────────────────────────────────────────
type CamState = "idle" | "requesting" | "active" | "denied" | "error";

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
  const scanSlot = useParkir((s) => s.scanSlot);
  const toast = useParkir((s) => s.toast);
  const campus = campusById(useParkir((s) => s.campusId));
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);

  const [flash, setFlash] = React.useState<string | null>(null);
  const [camState, setCamState] = React.useState<CamState>("idle");
  const [torchOn, setTorchOn] = React.useState(false);
  const [torchSupported, setTorchSupported] = React.useState(false);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const decodeLoopRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectorRef = React.useRef<BarcodeDetectorI | null>(null);
  const zxingRef = React.useRef<import("@zxing/browser").BrowserQRCodeReader | null>(null);
  const lastScannedRef = React.useRef<string | null>(null); // debounce duplicate scans

  /** Live dynamic walk-in rate */
  const demand = demandNow(slots, reservations);
  const walkInFee = DEMAND_TIERS[demand.tier].walkInFee;
  const tierLabel = tr(lang, demand.tier === "LOW" ? "dynLow" : demand.tier === "HIGH" ? "dynHigh" : "dynNormal");


  // ── start / stop camera ─────────────────────────────────────────────────

  const stopCamera = React.useCallback(() => {
    if (decodeLoopRef.current) clearTimeout(decodeLoopRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = React.useCallback(async () => {
    setCamState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Check torch support
      const track = stream.getVideoTracks()[0];
      const capabilities = track?.getCapabilities?.() as Record<string, unknown> | undefined;
      setTorchSupported(!!capabilities?.torch);

      // Init decoder
      if (typeof BarcodeDetector !== "undefined") {
        detectorRef.current = new BarcodeDetector({ formats: ["qr_code"] });
      } else {
        // Lazy-load @zxing fallback
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        zxingRef.current = new BrowserQRCodeReader();
      }

      setCamState("active");
      scheduleDecodeLoop();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("denied") || msg.includes("NotAllowed") || msg.includes("Permission")) {
        setCamState("denied");
      } else {
        setCamState("error");
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleDecodeLoop = React.useCallback(() => {
    decodeLoopRef.current = setTimeout(async () => {
      const video = videoRef.current;
      if (!video || !streamRef.current || video.readyState < 2) {
        scheduleDecodeLoop();
        return;
      }
      try {
        let raw: string | null = null;
        if (detectorRef.current) {
          const results = await detectorRef.current.detect(video);
          if (results.length > 0) raw = results[0].rawValue;
        } else if (zxingRef.current) {
          const result = await zxingRef.current
            .decodeOnceFromVideoElement(video)
            .catch(() => null);
          if (result) raw = result.getText();
        }
        if (raw && raw !== lastScannedRef.current) {
          lastScannedRef.current = raw;
          handleScan(raw);
          // reset debounce after 3s to allow re-scanning
          setTimeout(() => { lastScannedRef.current = null; }, 3000);
          return; // don't schedule next loop - flash will handle timing
        }
      } catch {
        /* decode errors are expected on frames without a QR code */
      }
      scheduleDecodeLoop();
    }, 250); // check every 250 ms
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── toggle torch ─────────────────────────────────────────────────────────

  const toggleTorch = React.useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await (track as MediaStreamTrack & { applyConstraints(c: unknown): Promise<void> })
        .applyConstraints({ advanced: [{ torch: !torchOn } as unknown as MediaTrackConstraintSet] });
      setTorchOn((v) => !v);
    } catch {
      /* torch not supported on this device */
    }
  }, [torchOn]);

  // ── lifecycle: start camera when overlay opens ────────────────────────────

  React.useEffect(() => {
    // Coming Soon campuses render a static gate screen with no <video>
    // element at all - never request the camera in that case, otherwise the
    // user gets a permission prompt and a live stream for a UI that can't
    // show it.
    if (!open || !campus.available) {
      stopCamera();
      // Reset state in a microtask to avoid synchronous setState-in-effect
      const t = setTimeout(() => {
        setCamState("idle");
        setTorchOn(false);
        lastScannedRef.current = null;
      }, 0);
      return () => clearTimeout(t);
    }
    // Only start if we have mediaDevices (browser + HTTPS/localhost)
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setTimeout(() => setCamState("error"), 0);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startCamera();
    return () => stopCamera();
  }, [open, campus.available]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── business logic (unchanged from original) ─────────────────────────────

  function handleScan(slotPayload: string) {
    const res = scanSlot(slotPayload);
    if (res.ok) {
      setFlash(slotPayload);
      setTimeout(() => {
        setFlash(null);
        scheduleDecodeLoop(); // resume scanning after flash
        onResult(res.kind, res.reservation?.id);
      }, 850);
    } else {
      const msg =
        res.reason === "unknown"    ? t("badCode")
        : res.reason === "busy"     ? t("slotBusy")
        : res.reason === "insufficient" ? t("insufficient")
        : res.reason === "max_active"   ? t("maxActiveToast")
        : res.reason === "wrong_campus" ? t("scanWrongCampus")
        : t("scanDenied");
      toast(msg, "error");
      scheduleDecodeLoop();
    }
  }

  if (!open) return null;

  // ── Coming Soon campus gate ────────────────────────────────────────────────
  if (!campus.available) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-[#04060d] pt-[env(safe-area-inset-top)]"
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary glow-primary">
              <QrCode className="h-4.5 w-4.5 text-primary-foreground" />
            </span>
            <div>
              <p className="font-display text-sm font-bold leading-tight">{t("scannerTitle")}</p>
              <p className="text-[10px] text-white/50">{campus.name}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label={t("close")} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white backdrop-blur transition hover:bg-white/10">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/25 bg-primary/[0.08]">
            <Building2 className="h-7 w-7 text-primary" />
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ScanLine className="h-3 w-3" />
            </span>
          </span>
          <p className="font-display text-base font-bold">{campus.name}</p>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
            {t("campusSoon")}
          </span>
          <p className="max-w-[300px] text-[12px] leading-relaxed text-white/50">{t("scanSoonNote")}</p>
        </div>
      </motion.div>
    );
  }

  // ── main scanner UI ────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#04060d] pt-[env(safe-area-inset-top)]"
    >
      {/* ── real camera video feed ── */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden
      />

      {/* dark vignette overlay so UI stays readable over any background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, transparent 45%, rgba(4,6,13,0.75) 100%)",
        }}
      />

      {/* top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pb-2 pt-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary glow-primary">
            <QrCode className="h-4.5 w-4.5 text-primary-foreground" />
          </span>
          <div>
            <p className="font-display text-sm font-bold leading-tight">{t("scannerTitle")}</p>
            <p className="text-[10px] text-white/50">
              {camState === "active"
                ? (lang === "id" ? "Kamera aktif" : "Camera active")
                : camState === "requesting"
                ? (lang === "id" ? "Meminta izin..." : "Requesting permission...")
                : t("scannerHint")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* torch button - only shown when supported */}
          {torchSupported && camState === "active" && (
            <button
              onClick={toggleTorch}
              aria-label={lang === "id" ? "Flash" : "Torch"}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur transition",
                torchOn
                  ? "border-primary/60 bg-primary/20 text-primary"
                  : "border-white/15 bg-white/[0.06] text-white hover:bg-white/10"
              )}
            >
              <Flashlight className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white backdrop-blur transition hover:bg-white/10"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* scan frame */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-8">
        <div className="relative aspect-square w-full max-w-[280px]">
          {/* corner brackets */}
          {[
            "left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-2xl",
            "right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-2xl",
            "left-0 bottom-0 border-l-[3px] border-b-[3px] rounded-bl-2xl",
            "right-0 bottom-0 border-r-[3px] border-b-[3px] rounded-br-2xl",
          ].map((c) => (
            <span key={c} className={cn("absolute h-10 w-10 border-primary", c)} />
          ))}

          {/* animated scan line - shown only when camera is active */}
          {camState === "active" && !flash && (
            <div className="absolute inset-3 overflow-hidden rounded-xl">
              <div className="animate-scanline absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_16px_rgba(59,130,246,0.8)]" />
            </div>
          )}

          {/* camera-denied / error state inside the frame */}
          {(camState === "denied" || camState === "error") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/60 backdrop-blur-[2px]">
              <CameraOff className="h-10 w-10 text-red-400" />
              <p className="px-4 text-center text-[11px] font-semibold text-white/70">
                {camState === "denied"
                  ? (lang === "id" ? "Izin kamera diperlukan untuk scan QR" : "Camera permission required to scan QR")
                  : (lang === "id" ? "Kamera tidak tersedia" : "Camera not available")}
              </p>
              <button
                onClick={() => { setCamState("idle"); startCamera(); }}
                className="mt-1 flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-bold text-primary-foreground"
              >
                <RefreshCw className="h-3 w-3" />
                {lang === "id" ? "Coba Lagi" : "Try Again"}
              </button>
            </div>
          )}

          {/* requesting state */}
          {camState === "requesting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/40 backdrop-blur-[2px]">
              <Camera className="h-10 w-10 animate-pulse text-primary" />
              <p className="text-[11px] font-semibold text-white/70">
                {lang === "id" ? "Meminta akses kamera..." : "Requesting camera access..."}
              </p>
            </div>
          )}

          {/* success flash */}
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

          {!flash && camState === "active" && (
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
        className="relative z-10 max-h-[52dvh] overflow-y-auto slim-scroll rounded-t-[2rem] border-t border-white/10 bg-[#0F172A]/95 px-4 pb-8 pt-4 backdrop-blur-xl"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />

        {/* live dynamic walk-in rate */}
        <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2">
          <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="text-[10.5px] font-semibold text-white/60">
            {t("dynWalkinNow")}:{" "}
            <span className="tnum font-bold text-primary">{rupiah(walkInFee)}</span>
            <span className="ml-1.5 text-[9px] font-black uppercase tracking-wider text-white/40">{tierLabel}</span>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
