"use client";
/**
 * AnalyticsView — operator "Analitik" tab.
 * End-to-end DS showcase on a deterministic 30-day synthetic dataset:
 * KPI strip → occupancy heatmap (day × hour) → 48h Holt-Winters forecast with
 * 90% band & model card → z-score anomaly list → daily revenue split →
 * what-if tariff simulator → analytics-ready CSV export.
 * Charts are hand-rolled SVG in a minimal Apple-Health style — no chart library.
 */
import React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  CircleAlert,
  Download,
  Gauge,
  LineChart as LineChartIcon,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useParkir } from "@/lib/store";
import { DAY_LABELS, rupiah, tr, DEMAND_TIERS, type DemandTier } from "@/lib/parking-data";
import {
  ANA_HOUR_START,
  analyticsCsv,
  buildAnalyticsWorld,
  computeModelParams,
  detectAnomalies,
  heatmapMatrix,
  holtWintersForecast,
  hourlyOccupancySeries,
  revenueAgg,
  simulate,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

const CARD = "glass rounded-3xl p-4";

function CardHead({
  icon: Icon,
  title,
  sub,
  right,
  tone = "text-primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub?: string;
  right?: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
          <Icon className={cn("h-4 w-4 shrink-0", tone)} />
          {title}
        </h3>
        {sub && <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function heatColor(v: number): string {
  if (v < 20) return "bg-emerald-400/[0.13]";
  if (v < 40) return "bg-emerald-400/30";
  if (v < 55) return "bg-amber-400/40";
  if (v < 70) return "bg-amber-400/65";
  if (v < 85) return "bg-orange-400/75";
  return "bg-red-400/80";
}

export function AnalyticsView() {
  const lang = useParkir((s) => s.lang);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const toast = useParkir((s) => s.toast);

  // Deterministic world — computed once per mount (the PRNG stream is frozen).
  const world = React.useMemo(() => buildAnalyticsWorld(), []);
  const heat = React.useMemo(() => heatmapMatrix(world), [world]);
  const series = React.useMemo(() => hourlyOccupancySeries(world), [world]);
  const forecast = React.useMemo(() => holtWintersForecast(series), [series]);
  const anomalies = React.useMemo(() => detectAnomalies(world), [world]);
  const revenue = React.useMemo(() => revenueAgg(world), [world]);
  const modelParams = React.useMemo(() => computeModelParams(world), [world]);

  const totalRevenue = revenue.reduce((a, r) => a + r.total, 0);
  const totalSessions = world.length;
  const avgOccupancy = Math.round(
    heat.flat().reduce((a, b) => a + b, 0) / (heat.length * heat[0].length)
  );

  // ── what-if state (v22 reserve prices per tier) ──
  const [pLow, setPLow] = React.useState(DEMAND_TIERS.LOW.advanceFee);
  const [pNormal, setPNormal] = React.useState(DEMAND_TIERS.NORMAL.advanceFee);
  const [pHigh, setPHigh] = React.useState(DEMAND_TIERS.HIGH.advanceFee);
  const sim = React.useMemo(
    () => simulate(world, { LOW: pLow, NORMAL: pNormal, HIGH: pHigh }),
    [world, pLow, pNormal, pHigh]
  );

  function exportCsv() {
    const csv = "\uFEFF" + analyticsCsv(world);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analitik-parkirbinus-30hari-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(t("csvExported"), "success");
  }

  // ── forecast chart geometry ──
  const HIST = 36; // hours of actual context shown
  const hist = series.slice(-HIST);
  const fMax = Math.max(100, ...hist, ...forecast.forecast, ...forecast.band.hi);
  const W = 640;
  const H = 190;
  const pad = { l: 6, r: 6, t: 10, b: 18 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const nPts = HIST + forecast.forecast.length;
  const x = (i: number) => pad.l + (i / (nPts - 1)) * iw;
  const y = (v: number) => pad.t + ih - (Math.min(v, fMax) / fMax) * ih;
  const line = (pts: number[], off = 0) =>
    pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i + off).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const bandPath =
    forecast.band.hi.map((v, i) => `${i === 0 ? "M" : "L"}${x(HIST + i).toFixed(1)},${y(v).toFixed(1)}`).join(" ") +
    " " +
    [...forecast.band.lo]
      .reverse()
      .map((v, i) => `L${x(HIST + forecast.band.lo.length - 1 - i).toFixed(1)},${y(v).toFixed(1)}`)
      .join(" ") +
    " Z";

  // hour labels under the forecast chart (every 12h)
  const hourLabels: { i: number; label: string }[] = [];
  for (let i = 0; i < nPts; i += 12) {
    const hourOfDay = (new Date().getHours() - HIST + i + 24 * 7) % 24;
    hourLabels.push({ i, label: `${String(hourOfDay).padStart(2, "0")}` });
  }

  // ── revenue bar chart geometry ──
  const revMax = Math.max(...revenue.map((r) => r.total));
  const kpis = [
    { label: t("anaKpiSessions"), value: String(totalSessions), icon: Gauge, cls: "border-sky-400/25 bg-sky-400/[0.06]", val: "text-sky-300" },
    { label: t("anaKpiRevenue"), value: rupiah(totalRevenue), icon: Wallet, cls: "border-primary/25 bg-primary/[0.07]", val: "text-primary" },
    { label: t("anaKpiOccupancy"), value: `${avgOccupancy}%`, icon: Activity, cls: "border-emerald-400/25 bg-emerald-400/[0.06]", val: "text-emerald-300" },
    { label: t("anaKpiMape"), value: `${forecast.mape.toFixed(1)}%`, icon: Sparkles, cls: "border-violet-400/25 bg-violet-400/[0.06]", val: "text-violet-300" },
  ];

  return (
    <div className="space-y-4">
      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {kpis.map((k) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("rounded-2xl border p-3", k.cls)}
          >
            <k.icon className={cn("h-4 w-4", k.val)} />
            <p className={cn("tnum mt-1.5 truncate font-display text-base font-bold leading-none", k.val)}>{k.value}</p>
            <p className="mt-1 text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">{k.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── heatmap ── */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className={CARD}>
        <CardHead
          icon={BarChart3}
          title={t("anaHeatmapTitle")}
          sub={t("anaHeatmapSub")}
          right={
            <div className="flex items-center gap-1">
              {[15, 40, 60, 85, 100].map((v) => (
                <span key={v} className={cn("h-3 w-4 rounded-sm", heatColor(v))} title={`${v}%`} />
              ))}
            </div>
          }
        />
        <div className="overflow-x-auto slim-scroll">
          <div className="min-w-[420px]">
            {heat.map((row, ri) => (
              <div key={ri} className="mb-1 flex items-center gap-1.5 last:mb-0">
                <span className="w-7 shrink-0 text-[9px] font-bold uppercase text-muted-foreground/70">
                  {DAY_LABELS[lang][ri]}
                </span>
                <div className="flex flex-1 gap-[3px]">
                  {row.map((v, hi) => (
                    <div
                      key={hi}
                      title={`${DAY_LABELS[lang][ri]} ${String(ANA_HOUR_START + hi).padStart(2, "0")}:00 · ${v}%`}
                      className={cn("h-4 flex-1 rounded-[3px]", heatColor(v))}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-1.5 flex items-center gap-1.5 pl-8">
              {Array.from({ length: 15 }, (_, i) => (
                <span key={i} className="tnum flex-1 text-center text-[7.5px] font-semibold text-muted-foreground/60">
                  {i % 2 === 0 ? String(ANA_HOUR_START + i).padStart(2, "0") : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── 48h forecast + model card ── */}
      <div className="grid gap-4 md:grid-cols-12">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }} className={cn(CARD, "md:col-span-7")}>
          <CardHead
            icon={LineChartIcon}
            title={t("anaForecastTitle")}
            sub={t("anaForecastSub")}
            right={
              <div className="flex items-center gap-2.5 text-[9px] font-bold">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="h-[3px] w-4 rounded-full bg-emerald-400" /> {t("cfActual")}
                </span>
                <span className="flex items-center gap-1 text-primary">
                  <span className="h-[3px] w-4 rounded-full bg-primary" /> {t("cfForecast")}
                </span>
              </div>
            }
          />
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t("anaForecastTitle")}>
            {/* grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((g) => (
              <line key={g} x1={pad.l} x2={W - pad.r} y1={pad.t + g * ih} y2={pad.t + g * ih} className="stroke-border" strokeWidth="1" strokeDasharray={g === 1 ? "0" : "2 4"} />
            ))}
            {/* 90% band */}
            <path d={bandPath} className="fill-primary/[0.28] stroke-primary/50" strokeWidth="0.8" strokeDasharray="3 3" />
            {/* actual context */}
            <path d={line(hist)} className="stroke-emerald-400" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {/* forecast */}
            <path d={line(forecast.forecast, HIST)} className="stroke-primary" strokeWidth="2.2" fill="none" strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />
            {/* now divider */}
            <line x1={x(HIST - 1)} x2={x(HIST - 1)} y1={pad.t - 4} y2={pad.t + ih + 4} className="stroke-muted-foreground/50" strokeWidth="1" strokeDasharray="2 3" />
            {hourLabels.map((h) => (
              <text key={h.i} x={x(h.i)} y={H - 4} textAnchor="middle" className="fill-muted-foreground/70" fontSize="9" fontWeight="600">
                {h.label}
              </text>
            ))}
          </svg>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }} className={cn(CARD, "md:col-span-5")}>
          <CardHead icon={Sparkles} title={t("anaModelCard")} tone="text-violet-400" />
          <div className="space-y-2">

            {/* parameters table */}
            <div className="rounded-xl border border-violet-400/20 bg-violet-400/[0.05] px-3 py-2.5">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-violet-400/80">
                {t("anaMcMethod")}
              </p>
              <p className="text-[10.5px] font-medium leading-snug">{t("anaMcMethodVal")}</p>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: t("anaMcAlpha"), value: modelParams.alpha.toFixed(2) },
                { label: t("anaMcBeta"),  value: modelParams.beta.toFixed(2) },
                { label: t("anaMcGamma"), value: modelParams.gamma.toFixed(2) },
              ].map((p) => (
                <div key={p.label} className="rounded-xl border border-border bg-card/50 px-2 py-2 text-center">
                  <p className="tnum font-display text-base font-black text-violet-300">{p.value}</p>
                  <p className="mt-0.5 text-[8px] font-semibold leading-tight text-muted-foreground">{p.label}</p>
                </div>
              ))}
            </div>

            {/* accuracy */}
            <div className="space-y-1.5">
              {[
                { label: t("anaMcMape"), value: modelParams.inSampleMape },
                { label: t("anaMcHoldOutMape"), value: modelParams.holdOutMape },
              ].map((row) => {
                const grade = row.value < 10 ? t("anaMcAccGood") : row.value < 20 ? t("anaMcAccOk") : t("anaMcAccPoor");
                const tone = row.value < 10 ? "text-emerald-400" : row.value < 20 ? "text-amber-400" : "text-red-400";
                const bar = row.value < 10 ? "bg-emerald-400" : row.value < 20 ? "bg-amber-400" : "bg-red-400";
                return (
                  <div key={row.label} className="rounded-xl border border-border bg-card/50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{row.label}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("tnum text-sm font-black", tone)}>{row.value.toFixed(1)}%</span>
                        <span className={cn("rounded-full px-1.5 py-0.5 text-[7.5px] font-black uppercase tracking-wide", tone, `bg-current/10`)}
                          style={{ backgroundColor: row.value < 10 ? "rgba(52,211,153,0.12)" : row.value < 20 ? "rgba(251,191,36,0.12)" : "rgba(248,113,113,0.12)" }}
                        >
                          {grade}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${Math.min(100, row.value * 3)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* training metadata */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-xl border border-border bg-card/50 px-2.5 py-2">
                <p className="text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground">{t("anaMcTrain")}</p>
                <p className="tnum mt-0.5 text-[11px] font-bold">30 {lang === "id" ? "hari" : "days"}</p>
                <p className="tnum text-[9px] text-muted-foreground">{modelParams.trainingSessions.toLocaleString()} {lang === "id" ? "sesi" : "sessions"}</p>
              </div>
              <div className="rounded-xl border border-border bg-card/50 px-2.5 py-2">
                <p className="text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground">{t("anaMcHoldOut")}</p>
                <p className="tnum mt-0.5 text-[11px] font-bold">7 {lang === "id" ? "hari" : "days"}</p>
                <p className="tnum text-[9px] text-muted-foreground">{modelParams.holdOutSessions.toLocaleString()} {lang === "id" ? "sesi" : "sessions"}</p>
              </div>
            </div>

            {/* features + limitations */}
            <div className="rounded-xl border border-border bg-card/50 px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{t("anaMcFeatures")}</p>
              <p className="mt-0.5 text-[10.5px] leading-snug font-medium">{t("anaMcFeaturesVal")}</p>
            </div>
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-amber-400/80">{t("anaMcLimit")}</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{t("anaMcLimitText")}</p>
            </div>
          </div>
        </motion.section>
      </div>

      {/* ── anomalies + revenue ── */}
      <div className="grid gap-4 md:grid-cols-12">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }} className={cn(CARD, "md:col-span-5")}>
          <CardHead icon={CircleAlert} title={t("anaAnomalyTitle")} tone="text-amber-400" />
          {anomalies.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
              {t("anaAnomalyEmpty")}
            </p>
          ) : (
            <div className="max-h-[240px] space-y-1.5 overflow-y-auto pr-1">
              {anomalies.map((a, i) => (
                <div key={`${a.date}-${a.hour}`} className="flex items-center gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2">
                  <span className="tnum w-10 shrink-0 rounded-lg bg-amber-400/15 py-1 text-center text-[10px] font-black text-amber-300">
                    z{a.z > 0 ? "+" : ""}{a.z}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="tnum text-[11.5px] font-bold leading-tight">
                      {a.date} · {String(a.hour).padStart(2, "0")}:00
                    </p>
                    <p className="tnum text-[10px] text-muted-foreground">
                      {a.value}% vs {t("anaMcMape").includes("MAPE") ? "μ" : "rata-rata"} {a.mean}%
                    </p>
                  </div>
                  {i === 0 && <span className="shrink-0 rounded-full bg-amber-400/20 px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-amber-300">TOP</span>}
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }} className={cn(CARD, "md:col-span-7")}>
          <CardHead
            icon={Wallet}
            title={t("anaRevenueTitle")}
            sub={t("anaRevenueSub")}
            right={
              <button
                onClick={exportCsv}
                className="flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary transition hover:bg-primary/20"
              >
                <Download className="h-3 w-3" />
                {t("anaCsv")}
              </button>
            }
          />
          <div className="flex h-[150px] items-end gap-[2.5px]">
            {revenue.map((r) => {
              const isSat = new Date(`${r.date}T00:00:00`).getDay() === 6;
              return (
                <div
                  key={r.date}
                  title={`${r.date} · ${rupiah(r.total)}`}
                  className="flex h-full flex-1 flex-col justify-end"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(4, (r.total / revMax) * 100)}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={cn("rounded-[3px]", isSat ? "bg-slate-500/40" : "bg-primary/70")}
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[9.5px] text-muted-foreground/70">
            ← 30 {lang === "id" ? "hari" : "days"} · {lang === "id" ? "abu = Sabtu (sepi)" : "grey = Saturday (quiet)"} · Σ {rupiah(totalRevenue)}
          </p>
        </motion.section>
      </div>

      {/* ── what-if simulator ── */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.25 }} className={CARD} data-whatif>
        <CardHead icon={Sparkles} title={t("anaWhatIfTitle")} sub={t("anaWhatIfSub")} tone="text-primary" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            {([
              { label: t("anaWhatIfLow"), value: pLow, set: setPLow, min: 10000, max: 30000, base: DEMAND_TIERS.LOW.advanceFee, tier: "LOW" },
              { label: t("anaWhatIfNormal"), value: pNormal, set: setPNormal, min: 15000, max: 40000, base: DEMAND_TIERS.NORMAL.advanceFee, tier: "NORMAL" },
              { label: t("anaWhatIfHigh"), value: pHigh, set: setPHigh, min: 20000, max: 60000, base: DEMAND_TIERS.HIGH.advanceFee, tier: "HIGH" },
            ] as const).map((s) => (
              <div key={s.tier}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="tnum text-sm font-bold">
                    {rupiah(s.value)}{" "}
                    <span className={cn("text-[10px] font-semibold", s.value === s.base ? "text-muted-foreground" : s.value > s.base ? "text-emerald-400" : "text-amber-400")}>
                      ({s.value === s.base ? "base" : `${s.value > s.base ? "+" : ""}${rupiah(s.value - s.base)}`})
                    </span>
                  </p>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={2500}
                  value={s.value}
                  onChange={(e) => s.set(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-[#FFD60A]"
                  data-whatif-slider={s.tier}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col justify-center gap-2.5 rounded-2xl border border-border bg-card/50 p-4" data-whatif-result>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{t("anaWhatIfBase")}</span>
              <span className="tnum font-bold">{rupiah(sim.base)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{t("anaWhatIfSim")}</span>
              <span className="tnum font-bold text-primary">{rupiah(sim.simulated)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-dashed border-border pt-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Δ</span>
              <span className={cn("tnum font-display text-xl font-black", sim.deltaPct >= 0 ? "text-emerald-400" : "text-amber-400")}>
                {sim.deltaPct >= 0 ? "+" : ""}{sim.deltaPct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                animate={{ width: `${Math.min(100, (sim.simulated / sim.base) * 100)}%` }}
                transition={{ duration: 0.5 }}
                className={cn("h-full rounded-full", sim.deltaPct >= 0 ? "bg-emerald-400" : "bg-amber-400")}
              />
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
