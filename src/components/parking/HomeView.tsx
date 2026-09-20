"use client";
/**
 * HomeView — hero availability, availability search
 * (date/time → count + free slot numbers), map preview, ads, heatmap.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  Clock,
  Coffee,
  MapPin,
  Maximize2,
  PartyPopper,
  Search,
  SearchX,
  Sparkles,
  TimerReset,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ParkingMap, MapLegend, useMapCounts } from "./ParkingMap";
import { DateGrid, TimeGrid, WindowPicker, fmtDateLabel } from "./WindowPickers";
import { useParkir } from "@/lib/store";
import {
  ADS,
  buildHeatmap,
  CAMPUSES,
  campusById,
  campusLabel,
  DAY_LABELS,
  slotStatusForWindow,
  TARIFF,
  toMinutes,
  fromMinutes,
  tr,
  type Ad,
  type Campus,
  type Lang,
  type TimeWindow,
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
}: {
  onSlotPress: (slotId: string, slotNumber: string) => void;
  onOpenMap: () => void;
}) {
  const lang = useParkir((s) => s.lang);
  const user = useParkir((s) => s.user);
  const win = useParkir((s) => s.viewWindow);
  const setWin = useParkir((s) => s.setViewWindow);
  const slots = useParkir((s) => s.slots);
  const reservations = useParkir((s) => s.reservations);
  const campus = campusById(useParkir((s) => s.campusId));
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const { free, total, pct } = useMapCounts();
  const [pickerOpen, setPickerOpen] = React.useState(false);

  /** null = belum mencari; setelah pencarian pertama, hasil mengikuti window aktif */
  const [searched, setSearched] = React.useState(false);
  const activeWin: TimeWindow | null = searched ? win : null;

  const results = React.useMemo(() => {
    if (!activeWin) return null;
    const freeSlots = slots.filter(
      (s) => slotStatusForWindow(s, reservations, activeWin) === "AVAILABLE"
    );
    return { freeSlots };
  }, [activeWin, slots, reservations]);

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
      </motion.div>

      {/* v26 — ending-soon banner (own active session ≤ 30 min left) */}
      <EndingSoonBanner />

      {/* ── campus bar ── */}
      <CampusBar campus={campus} lang={lang} onOpen={() => setPickerOpen(true)} />

      {/* ── hero availability / coming soon ── */}
      {campus.available ? (
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
      </motion.section>
      ) : (
        <ComingSoonHero campus={campus} lang={lang} onSeeOthers={() => setPickerOpen(true)} />
      )}

      {/* ── availability search (active campuses only) ── */}
      {campus.available && (
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
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

        {/* Cari Slot button — moved here */}
        <button
          onClick={() => setSearched(true)}
          className="glow-primary mt-3 flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-primary text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.98]"
        >
          <Search className="h-4.5 w-4.5" />
          {t("searchSlots")}
          <span className="tnum rounded-full bg-black/15 px-2 py-0.5 text-[10px] font-black">
            {free} {t("slotsFree")}
          </span>
        </button>

        {/* results — parking map as the result (no text lists) */}
        <AnimatePresence initial={false}>
          {results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2.5">
                {/* summary strip */}
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-primary/20 bg-primary/[0.04] px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("searchResults")}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
                      <span className="tnum font-display text-2xl font-bold leading-none text-gradient-gold">
                        {results.freeSlots.length}
                      </span>
                      <span className="tnum text-[11px] font-medium text-muted-foreground">
                        {t("slotsFound")} · {fmtDateLabel(activeWin!.date, lang)} {activeWin!.startTime}–{activeWin!.endTime}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={onOpenMap}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary transition hover:bg-primary/20 active:scale-95"
                  >
                    <Maximize2 className="h-3 w-3" />
                    {t("fullMap")}
                  </button>
                </div>

                {results.freeSlots.length === 0 && (
                  <div className="flex items-center gap-3 rounded-xl bg-red-400/[0.07] px-3 py-3">
                    <SearchX className="h-5 w-5 shrink-0 text-red-400" />
                    <div>
                      <p className="text-[13px] font-bold">{t("noSlotsFound")}</p>
                      <p className="text-[10.5px] text-muted-foreground">{t("noSlotsFoundSub")}</p>
                    </div>
                  </div>
                )}

                {/* the parking map IS the result */}
                <ParkingMap
                  compact
                  onSlotPress={(s) => onSlotPress(s.id, s.slotNumber)}
                />
                <MapLegend />
                <p className="text-center text-[10px] text-muted-foreground/70">
                  {t("tapSlotHint")}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
      )}

      {/* ── ads carousel ── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2 }}
        className="space-y-2.5"
      >
        <AdCarousel lang={lang} />
      </motion.section>

      {/* ── heatmap (Anggrek data — active campuses only) ── */}
      {campus.available && <HeatmapCard lang={lang} />}

      {/* ── campus picker ── */}
      <CampusPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </div>
  );
}

// ────────────────────────── ending soon (v26) ──────────────────────────

/** Amber banner when the user's own active session has ≤ 30 minutes left. */
function EndingSoonBanner() {
  const lang = useParkir((s) => s.lang);
  const user = useParkir((s) => s.user);
  const reservations = useParkir((s) => s.reservations);
  const extendSession = useParkir((s) => s.extendSession);
  const toast = useParkir((s) => s.toast);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const [, tick] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const soon = reservations.find((r) => {
    if (r.status !== "CHECKED_IN" || r.driverName !== user.name) return false;
    const left = Math.round((new Date(`${r.date}T${r.endTime}:00`).getTime() - now) / 60_000);
    return left > 0 && left <= 30;
  });
  if (!soon) return null;

  const minsLeft = Math.max(
    1,
    Math.round((new Date(`${soon.date}T${soon.endTime}:00`).getTime() - now) / 60_000)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      data-home-endsoon
      className="flex items-center gap-3 rounded-2xl border border-amber-400/50 bg-gradient-to-r from-amber-400/[0.16] to-amber-400/[0.05] px-4 py-3"
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20">
        <TriangleAlert className="h-4.5 w-4.5 animate-pulse text-amber-500 dark:text-amber-300" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-black leading-tight text-amber-600 dark:text-amber-300">
          {t("endSoonTitle")} · {minsLeft}m
        </p>
        <p className="mt-0.5 truncate text-[10.5px] leading-snug text-amber-700/80 dark:text-amber-200/70">
          {t("endSoonBody").replace("{slot}", soon.slotNumber).replace("{minutes}", String(minsLeft))}
        </p>
      </div>
      <button
        onClick={() => {
          const ok = extendSession(soon.id, 1);
          toast(ok ? t("extendOk") : t("extendFail"), ok ? "success" : "error");
        }}
        data-home-endsoon-extend
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-400/20 px-3 text-[11px] font-black text-amber-700 transition hover:bg-amber-400/30 active:scale-95 dark:text-amber-200"
      >
        <TimerReset className="h-3.5 w-3.5" />
        +1h
      </button>
    </motion.div>
  );
}

// ─────────────────────────── campus ───────────────────────────

/** Active-campus chip under the greeting — tap to switch campus. */
function CampusBar({ campus, lang, onOpen }: { campus: Campus; lang: Lang; onOpen: () => void }) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.03 }}
      onClick={onOpen}
      aria-label={t("campusPick")}
      className="glass flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left transition hover:border-primary/30 active:scale-[0.99]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <MapPin className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-bold leading-tight">
          {campusLabel(campus)}
        </span>
        <span className="block truncate text-[10px] text-muted-foreground">
          {campus.city} · {t("campusCurrent")}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider",
          campus.available
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
            : "border-primary/30 bg-primary/10 text-primary"
        )}
      >
        {campus.available ? t("campusActive") : t("campusSoon")}
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
    </motion.button>
  );
}

/** Dialog listing every campus — Coming Soon campuses stay selectable. */
function CampusPickerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useParkir((s) => s.lang);
  const campusId = useParkir((s) => s.campusId);
  const selectCampus = useParkir((s) => s.selectCampus);
  const toast = useParkir((s) => s.toast);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[400px] rounded-3xl border-border bg-card/95 p-5 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-base font-bold tracking-tight">
            {t("campusPick")}
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            {t("campusPickSub")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {CAMPUSES.map((c) => {
            const selected = c.id === campusId;
            return (
              <button
                key={c.id}
                onClick={() => {
                  selectCampus(c.id);
                  toast(`${t("campusSwitched")} · ${c.building ?? c.name}`, "success");
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99]",
                  selected
                    ? "border-primary/60 bg-primary/[0.08]"
                    : "border-border bg-card/40 hover:border-primary/25"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                    selected
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border bg-white/[0.03] text-muted-foreground"
                  )}
                >
                  <Building2 className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold leading-tight">{c.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {[c.building, c.city].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider",
                    c.available
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      : "border-primary/30 bg-primary/10 text-primary"
                  )}
                >
                  {c.available ? t("campusActive") : t("campusSoon")}
                </span>
                {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
        <p className="pt-1 text-center text-[10px] leading-relaxed text-muted-foreground/70">
          {t("campusPickNote")}
        </p>
      </DialogContent>
    </Dialog>
  );
}

/** Hero replacement for Coming Soon campuses. */
function ComingSoonHero({
  campus,
  lang,
  onSeeOthers,
}: {
  campus: Campus;
  lang: Lang;
  onSeeOthers: () => void;
}) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      className="glass glow-soft relative overflow-hidden rounded-3xl p-6 text-center"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative flex flex-col items-center">
        <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/25 bg-primary/[0.08]">
          <Building2 className="h-7 w-7 text-primary" />
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Clock className="h-3 w-3" />
          </span>
        </span>
        <h3 className="mt-3.5 font-display text-lg font-bold tracking-tight">{campus.name}</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{campus.city}</p>
        <span className="mt-3 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
          {t("campusSoon")}
        </span>
        <p className="mt-3.5 max-w-[300px] text-[12px] leading-relaxed text-muted-foreground">
          {t("campusSoonHeroSub")}
        </p>
        <button
          onClick={onSeeOthers}
          className="glow-primary mt-4 inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-[12.5px] font-bold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <MapPin className="h-4 w-4" />
          {t("campusSeeOthers")}
        </button>
      </div>
    </motion.section>
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
