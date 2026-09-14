"use client";
/** HomeView — hero availability, quick actions, window picker, map preview, ads, heatmap. */
import React from "react";
import { motion } from "framer-motion";
import {
  CalendarClock,
  CalendarDays,
  CarFront,
  ChevronRight,
  Clock,
  Coffee,
  Gauge,
  Map as MapIcon,
  Maximize2,
  PartyPopper,
  QrCode,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { ParkingMap, useMapCounts } from "./ParkingMap";
import { DateGrid, TimeGrid, WindowPicker, fmtDateLabel } from "./WindowPickers";
import { useParkir } from "@/lib/store";
import {
  ADS,
  buildHeatmap,
  DAY_LABELS,
  rupiah,
  slotStatusForWindow,
  TARIFF,
  toMinutes,
  fromMinutes,
  tr,
  type Ad,
} from "@/lib/parking-data";
import { cn } from "@/lib/utils";

const HEAT = buildHeatmap();

const AD_ICON: Record<Ad["theme"], React.ComponentType<{ className?: string }>> = {
  coffee: Coffee,
  carwash: CarFront,
  event: PartyPopper,
};

export function HomeView({
  onSlotPress,
  onOpenMap,
  onOpenScanner,
}: {
  onSlotPress: (slotId: string, slotNumber: string) => void;
  onOpenMap: () => void;
  onOpenScanner: () => void;
}) {
  const lang = useParkir((s) => s.lang);
  const user = useParkir((s) => s.user);
  const win = useParkir((s) => s.viewWindow);
  const setWin = useParkir((s) => s.setViewWindow);
  const slots = useParkir((s) => s.slots);
  const reservations = useParkir((s) => s.reservations);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const { free, total, pct } = useMapCounts();

  const hour = new Date().getHours();
  const greet =
    hour < 11 ? t("goodMorning") : hour < 18 ? t("goodAfternoon") : t("goodEvening");

  const levelKey = pct > 66 ? "high" : pct > 33 ? "medium" : "low";
  const levelTone: Record<string, string> = {
    low: "text-emerald-400",
    medium: "text-amber-400",
    high: "text-red-400",
  };
  const barTone: Record<string, string> = {
    low: "from-emerald-400 to-emerald-300",
    medium: "from-amber-400 to-amber-300",
    high: "from-red-400 to-orange-400",
  };

  return (
    <div className="space-y-4">
      {/* ── greeting ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between"
      >
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {greet}
          </p>
          <h2 className="font-display text-xl font-bold tracking-tight">
            {user.name.split(" ")[0]} 👋
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-300">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          {t("liveNow")}
        </span>
      </motion.div>

      {/* ── hero availability ── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="glass glow-soft relative overflow-hidden rounded-3xl p-5"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("availabilityNow")}
            </p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="tnum font-display text-[3.4rem] font-bold leading-none tracking-tight text-gradient-gold">
                {free}
              </span>
              <span className="tnum text-sm font-medium text-muted-foreground">
                /{total} {t("slotsFree")}
              </span>
            </div>
          </div>
          {/* capacity dial */}
          <div className="relative shrink-0" aria-hidden>
            <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
              <circle cx="38" cy="38" r="32" fill="none" stroke="currentColor" strokeWidth="7" className="text-foreground/[0.08]" />
              <circle
                cx="38"
                cy="38"
                r="32"
                fill="none"
                stroke="url(#dialGrad)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 201} 999`}
              />
              <defs>
                <linearGradient id="dialGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ffd60a" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
            <span className="tnum absolute inset-0 flex items-center justify-center text-sm font-bold">
              {pct}%
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("level")}</span>
          <span className={cn("font-bold", levelTone[levelKey])}>
            {t(levelKey as "low")} · {pct}%
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className={cn("h-full rounded-full bg-gradient-to-r", barTone[levelKey])}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Gauge className="h-3 w-3 text-primary" /> {t("advance")} {rupiah(TARIFF.advanceFee)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <QrCode className="h-3 w-3 text-primary" /> {t("walkIn")} {rupiah(TARIFF.walkInFee)}
          </span>
        </div>
      </motion.section>

      {/* ── quick actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="grid grid-cols-2 gap-3"
      >
        <button
          onClick={onOpenMap}
          className="glow-primary group relative overflow-hidden rounded-2xl bg-primary p-4 text-left transition-transform active:scale-[0.97]"
        >
          <MapIcon className="h-5 w-5 text-primary-foreground/80" />
          <p className="mt-6 font-display text-base font-bold text-primary-foreground">
            {t("findSlot")}
          </p>
          <p className="text-[11px] font-medium text-primary-foreground/60">
            {free} {t("slotsFree")}
          </p>
          <div aria-hidden className="absolute -bottom-5 -right-5 h-16 w-16 rounded-full bg-white/10 blur-xl" />
        </button>
        <button
          onClick={onOpenScanner}
          className="group relative overflow-hidden rounded-2xl border border-binus-bright/30 bg-gradient-to-br from-binus-blue/50 to-binus-bright/20 p-4 text-left transition-transform active:scale-[0.97]"
        >
          <QrCode className="h-5 w-5 text-binus-bright" />
          <p className="mt-6 font-display text-base font-bold">{t("scanQr")}</p>
          <p className="text-[11px] font-medium text-muted-foreground">
            {lang === "id" ? "check-in / keluar" : "check in / exit"}
          </p>
        </button>
      </motion.div>

      {/* ── window selector ── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="glass rounded-3xl p-4"
      >
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold">
          <CalendarClock className="h-4 w-4 text-primary" />
          {t("viewForTime")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <WindowPicker
            label={t("date")}
            display={fmtDateLabel(win.date, lang)}
            icon={<CalendarDays className="h-3.5 w-3.5" />}
          >
            {(close) => (
              <DateGrid
                value={win.date}
                lang={lang}
                onPick={(d) => {
                  setWin({ ...win, date: d });
                  close();
                }}
              />
            )}
          </WindowPicker>
          <WindowPicker
            label={t("startTime")}
            display={win.startTime}
            icon={<Clock className="h-3.5 w-3.5" />}
          >
            {(close) => (
              <TimeGrid
                value={win.startTime}
                onPick={(v) => {
                  const end = Math.min(
                    toMinutes(v) + 120,
                    TARIFF.closeHour * 60
                  );
                  setWin({ ...win, startTime: v, endTime: fromMinutes(end) });
                  close();
                }}
              />
            )}
          </WindowPicker>
          <WindowPicker
            label={t("endTime")}
            display={win.endTime}
            icon={<Clock className="h-3.5 w-3.5" />}
          >
            {(close) => (
              <TimeGrid
                value={win.endTime}
                from={toMinutes(win.startTime) + 30}
                onPick={(v) => {
                  setWin({ ...win, endTime: v });
                  close();
                }}
              />
            )}
          </WindowPicker>
        </div>
      </motion.section>

      {/* ── map preview ── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2 }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold tracking-tight">{t("parkingMap")}</h3>
          <button
            onClick={onOpenMap}
            className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary transition hover:bg-primary/20"
          >
            <Maximize2 className="h-3 w-3" />
            {t("fullMap")}
          </button>
        </div>
        <ParkingMap
          compact
          onSlotPress={(s) => {
            const st = slotStatusForWindow(s, reservations, win);
            if (st === "AVAILABLE") onSlotPress(s.id, s.slotNumber);
          }}
        />
        <p className="mt-2 text-center text-[10px] text-muted-foreground/70">{t("tapSlotHint")}</p>
      </motion.section>

      {/* ── ads carousel ── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.25 }}
        className="space-y-2.5"
      >
        <AdCarousel lang={lang} />
      </motion.section>

      {/* ── heatmap ── */}
      <HeatmapCard lang={lang} />
    </div>
  );
}

// ─────────────────────────── ads ───────────────────────────

function AdCarousel({ lang }: { lang: "id" | "en" }) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const ref = React.useRef<HTMLDivElement>(null);
  const [idx, setIdx] = React.useState(0);

  const onScroll = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIdx(Math.max(0, Math.min(ADS.length - 1, i)));
  }, []);

  const tone: Record<Ad["accent"], string> = {
    amber: "border-amber-400/25 bg-gradient-to-r from-amber-400/[0.12] to-transparent",
    sky: "border-sky-400/25 bg-gradient-to-r from-sky-400/[0.12] to-transparent",
    violet: "border-violet-400/25 bg-gradient-to-r from-violet-400/[0.12] to-transparent",
  };
  const ico: Record<Ad["accent"], string> = {
    amber: "bg-amber-400/15 text-amber-300",
    sky: "bg-sky-400/15 text-sky-300",
    violet: "bg-violet-400/15 text-violet-300",
  };

  return (
    <>
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold tracking-tight">
          {lang === "id" ? "Promo kampus" : "Campus promos"}
        </h3>
        <div className="flex gap-1.5">
          {ADS.map((_, i) => (
            <button
              key={i}
              onClick={() => ref.current?.scrollTo({ left: i * ref.current.clientWidth, behavior: "smooth" })}
              aria-label={`promo ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === idx ? "w-5 bg-primary" : "w-1.5 bg-white/15 hover:bg-white/25"
              )}
            />
          ))}
        </div>
      </div>
      <div
        ref={ref}
        onScroll={onScroll}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1"
      >
        {ADS.map((ad) => {
          const Icon = AD_ICON[ad.theme];
          return (
            <a
              key={ad.id}
              href="#"
              onClick={(e) => e.preventDefault()}
              className={cn(
                "flex w-[85%] shrink-0 snap-start items-center gap-3 rounded-2xl border p-3.5 transition hover:brightness-110",
                tone[ad.accent]
              )}
            >
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", ico[ad.accent])}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{ad.title}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{ad.description}</span>
              </span>
              <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-[10px] font-black text-primary-foreground">
                {ad.ctaText}
              </span>
              <span className="sr-only">(ad)</span>
            </a>
          );
        })}
      </div>
    </>
  );
}

// ─────────────────────────── heatmap ───────────────────────────

function heatColor(v: number): string {
  if (v < 0.25) return `rgba(52, 211, 153, ${0.12 + v * 0.5})`;
  if (v < 0.55) return `rgba(255, 214, 10, ${0.15 + v * 0.55})`;
  return `rgba(248, 113, 113, ${0.25 + v * 0.6})`;
}

function HeatmapCard({ lang }: { lang: "id" | "en" }) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const { busiest, quietest } = React.useMemo(() => {
    let best = { v: -1, label: "" };
    let worst = { v: 2, label: "" };
    HEAT.forEach((row, d) => {
      row.forEach((v, h) => {
        const label = `${DAY_LABELS[lang][d]} ${String(h + 7).padStart(2, "0")}:00`;
        if (v > best.v) best = { v, label };
        if (v < worst.v) worst = { v, label };
      });
    });
    return { busiest: best.label, quietest: worst.label };
  }, [lang]);

  return (
    <section className="glass rounded-3xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("heatmap")}
          </h3>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{t("heatmapSub")}</p>
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className="flex flex-col gap-1 pt-[13px]">
          {DAY_LABELS[lang].map((d) => (
            <span key={d} className="h-3 text-[8px] font-semibold leading-3 text-muted-foreground/70">
              {d}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex gap-[3px] pr-6">
            {Array.from({ length: 15 }, (_, h) => (
              <span key={h} className="tnum flex-1 text-center text-[7px] text-muted-foreground/50">
                {(h + 7) % 3 === 0 ? h + 7 : ""}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {HEAT.map((row, d) => (
              <div key={d} className="flex gap-[3px]">
                {row.map((v, h) => (
                  <span
                    key={h}
                    title={`${DAY_LABELS[lang][d]} ${h + 7}:00 · ${Math.round(v * 100)}%`}
                    className="h-3 flex-1 rounded-[3px] transition-transform hover:scale-125"
                    style={{ background: heatColor(v) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 rounded-xl bg-red-400/[0.08] px-2.5 py-2">
          <TrendingUp className="h-3.5 w-3.5 shrink-0 text-red-400" />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-red-400/80">{t("busiest")}</p>
            <p className="tnum truncate text-[11px] font-bold">{busiest}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-emerald-400/[0.08] px-2.5 py-2">
          <TrendingDown className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400/80">{t("quietest")}</p>
            <p className="tnum truncate text-[11px] font-bold">{quietest}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
