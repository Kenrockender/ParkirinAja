"use client";
/**
 * FeatureKnowledge - in-UI feature spotlight ("coach marks").
 * Highlights the real control on screen and explains what it does and where it is.
 * Targets are elements marked with `data-tour="<id>"`; a missing target is skipped.
 */
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { useParkir } from "@/lib/store";
import { cn } from "@/lib/utils";

type Bi = { id: string; en: string };

const SEEN_KEY = "parkir-binus:feature-knowledge-seen:v2";

/** True once the user has finished or skipped the spotlight tour (first-login auto-open). */
export function hasSeenFeatureKnowledge(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markFeatureKnowledgeSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* storage disabled - it will simply auto-open again next time */
  }
}

type Step = {
  target: string;
  title: Bi;
  body: Bi;
  where: Bi;
  guestNote?: Bi;
};

const STEPS: Step[] = [
  {
    target: "campus",
    title: { id: "Pilih Kampus & Cek Ketersediaan", en: "Pick a Campus & Check Availability" },
    body: {
      id: "Ketuk untuk ganti kampus (Kemanggisan, Alam Sutera, Bekasi). Kartu ini menampilkan jumlah slot kosong dan tingkat kepadatan - kepadatan menentukan harga.",
      en: "Tap to switch campus (Kemanggisan, Alam Sutera, Bekasi). This card shows free slots and occupancy - occupancy sets the price.",
    },
    where: { id: "Beranda, bagian atas", en: "Home, top" },
  },
  {
    target: "time",
    title: { id: "Atur Tanggal & Jam", en: "Set Date & Time" },
    body: {
      id: "Pilih tanggal, jam mulai dan jam selesai (06:00–22:00) untuk melihat slot yang tersedia di waktu itu.",
      en: "Choose the date, start and end time (06:00–22:00) to see which slots are free then.",
    },
    where: { id: "Beranda → Lihat untuk waktu", en: "Home → View for time" },
  },
  {
    target: "slot-filter",
    title: { id: "Slot EV & Disabilitas", en: "EV & Accessible Slots" },
    body: {
      id: "Saring slot khusus kendaraan listrik (ikon petir) atau disabilitas (ikon kursi roda).",
      en: "Filter for electric-vehicle (lightning) or accessible (wheelchair) slots.",
    },
    where: { id: "Beranda → filter slot", en: "Home → slot filter" },
  },
  {
    target: "search",
    title: { id: "Cari & Pesan Slot", en: "Find & Book a Slot" },
    body: {
      id: "Tekan untuk menampilkan slot, lalu ketuk slot yang tersedia → pilih kendaraan → Bayar & Pesan. Tiket langsung terbit. Biaya Rp15.000–35.000 mengikuti kepadatan.",
      en: "Tap to show slots, then tap a free slot → pick a vehicle → Pay & Book. Your ticket is issued instantly. Fee Rp15,000–35,000 depending on occupancy.",
    },
    where: { id: "Beranda → Cari Slot", en: "Home → Search Slots" },
    guestNote: {
      id: "Akun tamu hanya bisa Walk-in (scan QR slot kosong).",
      en: "Guest accounts can only Walk-in (scan an empty slot's QR).",
    },
  },
  {
    target: "notif",
    title: { id: "Notifikasi", en: "Notifications" },
    body: {
      id: "Pengingat saat sesi parkir hampir habis atau sudah lewat waktu muncul di sini.",
      en: "Reminders when your session is ending or overdue show up here.",
    },
    where: { id: "Ikon lonceng, kanan atas", en: "Bell icon, top right" },
  },
  {
    target: "scan",
    title: { id: "Scan QR", en: "Scan QR" },
    body: {
      id: "Satu tombol untuk semua: punya booking → check-in; slot kosong tanpa booking → Walk-in; sedang parkir → check-out. Izinkan akses kamera bila diminta.",
      en: "One button for everything: have a booking → check-in; empty slot without booking → Walk-in; already parked → check-out. Allow camera access when asked.",
    },
    where: { id: "Tombol bulat di tengah menu bawah", en: "Round button in the bottom menu" },
  },
  {
    target: "nav-history",
    title: { id: "Riwayat & Tiket", en: "History & Tickets" },
    body: {
      id: "Buka tiket untuk petunjuk arah ke slot, Perpanjang (maks. 22:00), Batalkan (refund 100% ≤ 10 menit, setelahnya 50%), dan unduh struk PDF.",
      en: "Open a ticket for directions to your slot, Extend (until 22:00), Cancel (100% refund within 10 min, 50% after) and download the PDF receipt.",
    },
    where: { id: "Menu bawah → Riwayat", en: "Bottom menu → History" },
  },
  {
    target: "nav-wallet",
    title: { id: "Dompet & Top Up", en: "Wallet & Top Up" },
    body: {
      id: "Semua biaya dibayar dari saldo. Isi saldo lewat Top Up dan lihat riwayat transaksi. Denda telat Rp5.000 per jam dipotong otomatis.",
      en: "Every fee is paid from your balance. Add funds with Top Up and see your transactions. Late fines (Rp5,000/hour) are deducted automatically.",
    },
    where: { id: "Menu bawah → Dompet", en: "Bottom menu → Wallet" },
  },
  {
    target: "nav-profile",
    title: { id: "Profil & Pengaturan", en: "Profile & Settings" },
    body: {
      id: "Tambah kendaraan, nyalakan notifikasi push, ganti bahasa dan tema. Panduan ini bisa dibuka lagi dari Profil → Pengetahuan Fitur.",
      en: "Add vehicles, turn on push notifications, switch language and theme. Reopen this guide from Profile → Feature Knowledge.",
    },
    where: { id: "Menu bawah → Profil", en: "Bottom menu → Profile" },
  },
];

const PAD = 6;

type Rect = { top: number; left: number; width: number; height: number };

function findTarget(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-tour="${id}"]`);
}

/** True when the element (or an ancestor) is position:fixed - it does not move on scroll. */
function isFixed(el: HTMLElement): boolean {
  for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
    if (getComputedStyle(n).position === "fixed") return true;
  }
  return false;
}

export function FeatureKnowledge({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useParkir((s) => s.lang);
  const isBinusian = useParkir((s) => s.user.isBinusian);
  const L = (b: Bi) => b[lang === "en" ? "en" : "id"];
  const titleId = React.useId();

  const [i, setI] = React.useState(0);
  const [rect, setRect] = React.useState<Rect | null>(null);
  const [bubbleH, setBubbleH] = React.useState(190);
  const bubbleRef = React.useRef<HTMLDivElement>(null);
  const dir = React.useRef<1 | -1>(1);

  React.useEffect(() => {
    if (open) {
      setI(0);
      dir.current = 1;
    }
  }, [open]);

  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  const close = React.useCallback(() => onCloseRef.current(), []);

  const go = React.useCallback(
    (d: 1 | -1) => {
      dir.current = d;
      const n = i + d;
      if (n >= STEPS.length) onCloseRef.current();
      else setI(Math.max(0, n));
    },
    [i]
  );

  // Per step: wait for the target to mount (tab transitions), work out where it will sit
  // AFTER scrolling, and glide the spotlight straight there while the page scrolls -
  // instead of chasing the button mid-scroll. Once settled, keep following it every
  // frame (resize, late layout). Skip a target that never appears.
  React.useEffect(() => {
    if (!open) return;
    let raf = 0;
    let settleAt = 0;
    const started = performance.now();
    const tick = () => {
      const now = performance.now();
      const bh = bubbleRef.current?.offsetHeight;
      if (bh) setBubbleH((p) => (Math.abs(p - bh) < 1 ? p : bh));
      const el = findTarget(STEPS[i].target);
      if (!el) {
        if (now - started > 1200) {
          go(i === 0 ? 1 : dir.current);
          return;
        }
        raf = requestAnimationFrame(tick);
        return;
      }
      const r = el.getBoundingClientRect();
      if (!settleAt) {
        // first sighting: scroll (if the target is in the page) and aim at the final spot
        let finalTop = r.top;
        if (!isFixed(el)) {
          const vh = window.innerHeight;
          const maxY = document.documentElement.scrollHeight - vh;
          const docTop = r.top + window.scrollY;
          // park the target in the upper third so the text box fits below it
          const wantY = Math.min(Math.max(0, docTop - vh * 0.28), Math.max(0, maxY));
          if (Math.abs(wantY - window.scrollY) > 2) window.scrollTo({ top: wantY, behavior: "smooth" });
          finalTop = docTop - wantY;
        }
        setRect({ top: finalTop, left: r.left, width: r.width, height: r.height });
        settleAt = now + 650;
      } else if (now > settleAt) {
        setRect((prev) =>
          prev &&
          Math.abs(prev.top - r.top) < 0.5 &&
          Math.abs(prev.left - r.left) < 0.5 &&
          Math.abs(prev.width - r.width) < 0.5 &&
          Math.abs(prev.height - r.height) < 0.5
            ? prev
            : { top: r.top, left: r.left, width: r.width, height: r.height }
        );
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, i, go]);

  // forget the last position once closed, so a reopen starts fresh
  React.useEffect(() => {
    if (!open) setRect(null);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, go]);

  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  // Bubble goes below the target in the top half of the screen, above it in the bottom half.
  // Always expressed as top/left so the bubble can glide between positions.
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const bubbleW = Math.min(360, vw - 24);
  let bubbleLeft = (vw - bubbleW) / 2;
  let bubbleTop = vh / 2 - bubbleH / 2;
  if (rect) {
    const center = rect.left + rect.width / 2;
    bubbleLeft = Math.min(Math.max(12, center - bubbleW / 2), vw - bubbleW - 12);
    const below = rect.top + rect.height / 2 < vh / 2;
    bubbleTop = below ? rect.top + rect.height + PAD + 12 : rect.top - PAD - 12 - bubbleH;
    bubbleTop = Math.min(Math.max(12, bubbleTop), vh - bubbleH - 12);
  }
  const glide = { type: "spring", stiffness: 210, damping: 28, mass: 0.9 } as const;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {/* click-blocker; the dimming comes from the spotlight's shadow */}
          <div className="absolute inset-0" aria-hidden />

          {rect ? (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute rounded-[1.1rem] ring-2 ring-primary"
              style={{
                // dim everything outside the target + soft glow around it
                boxShadow:
                  "0 0 0 9999px rgba(2,6,23,0.6), 0 0 18px 4px rgba(59,130,246,0.75), 0 0 42px 12px rgba(59,130,246,0.35)",
              }}
              initial={false}
              animate={{
                top: rect.top - PAD,
                left: rect.left - PAD,
                width: rect.width + PAD * 2,
                height: rect.height + PAD * 2,
              }}
              transition={glide}
            >
              {/* pulsing halo */}
              <motion.span
                className="absolute inset-0 rounded-[1.1rem] ring-2 ring-primary/70"
                animate={{ scale: [1, 1.12, 1], opacity: [0.9, 0, 0.9] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
            </motion.div>
          ) : (
            <div aria-hidden className="absolute inset-0 bg-[rgba(2,6,23,0.6)]" />
          )}

          <motion.div
            ref={bubbleRef}
            initial={{ opacity: 0, top: bubbleTop + 10, left: bubbleLeft }}
            animate={{ opacity: 1, top: bubbleTop, left: bubbleLeft }}
            transition={glide}
            style={{ width: bubbleW }}
            className="glass absolute overflow-hidden rounded-2xl border border-primary/30 p-4 text-foreground shadow-2xl"
            aria-live="polite"
          >
            {/* text crossfades + slides in the direction of travel */}
            <AnimatePresence mode="wait" initial={false} custom={dir.current}>
            <motion.div
              key={i}
              custom={dir.current}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d * 18 }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: d * -18 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                  {lang === "en" ? "Feature Knowledge" : "Pengetahuan Fitur"} · {i + 1}/{STEPS.length}
                </p>
                <h2 id={titleId} className="mt-1 font-display text-[15px] font-bold leading-tight">
                  {L(step.title)}
                </h2>
              </div>
              <button
                onClick={close}
                aria-label={lang === "en" ? "Close guide" : "Tutup panduan"}
                className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-[12.5px] leading-snug text-muted-foreground">{L(step.body)}</p>

            {step.guestNote && !isBinusian && (
              <p className="mt-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11.5px] leading-snug text-amber-500">
                {L(step.guestNote)}
              </p>
            )}

            <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-foreground/80">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              {lang === "en" ? "Location:" : "Letak:"} {L(step.where)}
            </p>
            </motion.div>
            </AnimatePresence>

            <div className="mt-3.5 flex items-center gap-2">
              {/* progress dots */}
              <div className="flex flex-1 gap-1" aria-hidden>
                {STEPS.map((_, k) => (
                  <span
                    key={k}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      k === i ? "w-4 bg-primary" : "w-1.5 bg-foreground/20"
                    )}
                  />
                ))}
              </div>
              {i === 0 ? (
                <button
                  onClick={close}
                  className="rounded-full px-3 py-1.5 text-[12px] font-bold text-muted-foreground transition hover:text-foreground"
                >
                  {lang === "en" ? "Skip" : "Lewati"}
                </button>
              ) : (
                <button
                  onClick={() => go(-1)}
                  className="rounded-full border border-border px-3 py-1.5 text-[12px] font-bold text-muted-foreground transition hover:text-foreground"
                >
                  {lang === "en" ? "Back" : "Kembali"}
                </button>
              )}
              <button
                onClick={() => go(1)}
                autoFocus
                className="rounded-full bg-primary px-4 py-1.5 text-[12px] font-bold text-primary-foreground transition active:scale-95"
              >
                {last ? (lang === "en" ? "Got it" : "Mengerti") : lang === "en" ? "Next" : "Lanjut"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
