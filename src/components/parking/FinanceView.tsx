"use client";
/**
 * FinanceView — operator "Keuangan" tab (v23 + v24).
 * KPI strip → double-entry journal → trial balance (SEIMBANG) → profit
 * waterfall → interactive break-even → PPN 11% invoices → 14-day cash-flow
 * projection. Everything derives from the REAL wallet transactions.
 */
import React from "react";
import { motion } from "framer-motion";
import {
  Banknote,
  BarChart3,
  FileText,
  Landmark,
  LineChart as LineChartIcon,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useParkir } from "@/lib/store";
import { rupiah, tr, type Txn } from "@/lib/parking-data";
import {
  BEP_DEFAULTS,
  breakEven,
  buildJournal,
  cashPosition,
  profitAndLoss,
  rupiahShort,
  trialBalance,
} from "@/lib/ledger";
import { buildInvoices, ppnRecap, splitPpn, type Invoice } from "@/lib/invoice";
import { projectCashflow } from "@/lib/cashflow";
import { revenueAgg, buildAnalyticsWorld } from "@/lib/analytics";
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

export function FinanceView() {
  const lang = useParkir((s) => s.lang);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const txns = useParkir((s) => s.transactions);
  const reservations = useParkir((s) => s.reservations);

  // ── ledger (v23) — from REAL transactions ──
  const journal = React.useMemo(() => buildJournal(txns), [txns]);
  const tb = React.useMemo(() => trialBalance(journal), [journal]);
  const pl = React.useMemo(() => profitAndLoss(journal), [journal]);
  const cash = React.useMemo(() => cashPosition(journal), [journal]);
  const paidSessions = React.useMemo(
    () => txns.filter((x) => x.type === "SERVICE_FEE").length,
    [txns]
  );
  const arpu = paidSessions > 0 ? Math.round(pl.service / paidSessions) : 0;
  const fineRatio = pl.service + pl.fines > 0 ? (pl.fines / (pl.service + pl.fines)) * 100 : 0;

  // ── break-even sliders ──
  const [fixedCost, setFixedCost] = React.useState<number>(BEP_DEFAULTS.fixed);
  const [varCost, setVarCost] = React.useState<number>(BEP_DEFAULTS.variable);
  // run-rate: paid sessions in the last 30 days scaled to a month window
  const runRate = React.useMemo(() => {
    const since = Date.now() - 30 * 24 * 3600_000;
    return txns.filter((x) => x.type === "SERVICE_FEE" && x.createdAt >= since).length;
  }, [txns]);
  const bep = React.useMemo(
    () => breakEven({ fixed: fixedCost, variable: varCost, arpu: Math.max(arpu, 1), runRateSessions: Math.max(runRate, 1) }),
    [fixedCost, varCost, arpu, runRate]
  );

  // ── invoices (v24) ──
  const invoices = React.useMemo(() => buildInvoices(txns, reservations), [txns, reservations]);
  const recap = React.useMemo(() => ppnRecap(invoices), [invoices]);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthCount = recap.months.find((m) => m.month === thisMonth)?.count ?? 0;
  const [invOpen, setInvOpen] = React.useState<Invoice | null>(null);

  // ── cashflow (v24) — read-only from the analytics dataset ──
  const cf = React.useMemo(() => {
    const world = buildAnalyticsWorld();
    return projectCashflow(revenueAgg(world));
  }, []);

  // ── waterfall geometry ──
  const wfMax = Math.max(pl.service + pl.fines, 1);
  const wf = [
    { label: t("finWfService"), value: pl.service, color: "bg-emerald-400/70" },
    { label: t("finWfFine"), value: pl.fines, color: "bg-sky-400/70" },
    { label: t("finWfRefund"), value: -pl.refunds, color: "bg-red-400/70" },
    { label: t("finWfProfit"), value: pl.netIncome, color: "bg-primary" },
  ];

  // ── BEP chart geometry ──
  const bepMaxX = Math.max(bep.bepSessions * 1.35, runRate * 1.2, 100);
  const bepMaxY = Math.max(fixedCost * 1.5, arpu * bepMaxX || 1);
  const bw = 300;
  const bh = 150;
  const bx = (sessions: number) => (sessions / bepMaxX) * bw;
  const by = (rp: number) => bh - (rp / bepMaxY) * bh;

  // ── cashflow chart geometry ──
  const cfW = 640;
  const cfH = 170;
  const cfPad = { l: 6, r: 6, t: 10, b: 16 };
  const cfiw = cfW - cfPad.l - cfPad.r;
  const cfih = cfH - cfPad.t - cfPad.b;
  const cfMax = Math.max(...cf.days.map((d) => Math.max(d.actual ?? 0, d.hi)), 1);
  const cx = (i: number) => cfPad.l + (i / (cf.days.length - 1)) * cfiw;
  const cy = (v: number) => cfPad.t + cfih - (Math.min(v, cfMax) / cfMax) * cfih;
  const cfActualLine = cf.days
    .map((d, i) => (d.actual !== undefined ? `${cx(i).toFixed(1)},${cy(d.actual).toFixed(1)}` : null))
    .filter(Boolean)
    .map((p, i, arr) => `${i === 0 || arr[i - 1] === null ? "M" : "L"}${p}`)
    .join(" ");
  const cfForecastLine = cf.days
    .map((d, i) => (d.actual === undefined ? `${cx(i).toFixed(1)},${cy(d.forecast).toFixed(1)}` : null))
    .filter(Boolean)
    .map((p, i, arr) => `${i === 0 || arr[i - 1] === null ? "M" : "L"}${p}`)
    .join(" ");
  const cfBandPath =
    cf.days
      .map((d, i) => (d.actual === undefined ? `L${cx(i).toFixed(1)},${cy(d.hi).toFixed(1)}` : null))
      .filter(Boolean)
      .join(" ")
      .replace(/^L/, "M") +
    " " +
    cf.days
      .map((d, i) => (d.actual === undefined ? `L${cx(i).toFixed(1)},${cy(d.lo).toFixed(1)}` : null))
      .filter(Boolean)
      .reverse()
      .join(" ") +
    " Z";
  const nowIdx = cf.days.findIndex((d) => d.actual === undefined) - 1;

  const kpis = [
    { label: t("finKpiRevenue"), value: rupiah(pl.netIncome), icon: Banknote, cls: "border-primary/25 bg-primary/[0.07]", val: "text-primary" },
    { label: t("finKpiSessions"), value: String(paidSessions), icon: Wallet, cls: "border-sky-400/25 bg-sky-400/[0.06]", val: "text-sky-300" },
    { label: t("finKpiArpu"), value: rupiah(arpu), icon: TrendingUp, cls: "border-emerald-400/25 bg-emerald-400/[0.06]", val: "text-emerald-300" },
    { label: t("finKpiFineRatio"), value: `${fineRatio.toFixed(0)}%`, icon: TrendingDown, cls: "border-amber-400/25 bg-amber-400/[0.06]", val: "text-amber-300" },
  ];

  return (
    <div className="space-y-4">
      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {kpis.map((k) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-2xl border p-3", k.cls)}>
            <k.icon className={cn("h-4 w-4", k.val)} />
            <p className={cn("tnum mt-1.5 truncate font-display text-base font-bold leading-none", k.val)}>{k.value}</p>
            <p className="mt-1 text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">{k.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── journal + trial balance ── */}
      <div className="grid gap-4 md:grid-cols-12">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className={cn(CARD, "md:col-span-7")}>
          <CardHead
            icon={Landmark}
            title={t("finJournalTitle")}
            sub={t("finJournalSub")}
            right={<span className="tnum rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black text-primary">{journal.length}</span>}
          />
          <div className="max-h-[300px] space-y-1.5 overflow-y-auto pr-1" data-je-scroll>
            {journal.slice(0, 14).map((e) => (
              <div key={e.id} data-je-id={e.id} className="rounded-xl border border-border/60 bg-card/30 px-3 py-2.5">
                <p className="flex items-baseline justify-between gap-2 text-[10px] text-muted-foreground">
                  <span className="tnum truncate">{new Date(e.at).toLocaleString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="truncate font-semibold">{e.memo}</span>
                </p>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {e.lines.map((l) => (
                    <div
                      key={l.account}
                      className={cn(
                        "rounded-lg border px-2 py-1.5",
                        l.dr > 0 ? "border-emerald-400/25 bg-emerald-400/[0.07]" : "border-amber-400/25 bg-amber-400/[0.07]"
                      )}
                    >
                      <p className="tnum truncate text-[9px] font-bold text-muted-foreground">{l.account}</p>
                      <p className={cn("tnum text-[11.5px] font-bold", l.dr > 0 ? "text-emerald-300" : "text-amber-300")}>
                        {l.dr > 0 ? `Dr ${rupiah(l.dr)}` : `Cr ${rupiah(l.cr)}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }} className={cn(CARD, "md:col-span-5")}>
          <CardHead
            icon={Scale}
            title={t("finTrialTitle")}
            right={
              <span data-trial-balanced className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider text-emerald-400">
                {t("finTrialBalanced")}
              </span>
            }
          />
          <div className="overflow-hidden rounded-xl border border-border">
            {tb.rows.map((r) => (
              <div key={r.account} className={cn("flex items-center gap-2 border-b border-border/50 px-3 py-2 last:border-0", (r.dr === 0 && r.cr === 0) && "opacity-40")}>
                <span className="tnum w-14 shrink-0 text-[9.5px] font-bold text-muted-foreground">{r.account}</span>
                <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold">{r.name}</span>
                <span className="tnum w-[86px] shrink-0 text-right text-[10.5px] font-bold text-emerald-300">{r.dr > 0 ? rupiah(r.dr) : "—"}</span>
                <span className="tnum w-[86px] shrink-0 text-right text-[10.5px] font-bold text-amber-300">{r.cr > 0 ? rupiah(r.cr) : "—"}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 bg-primary/[0.07] px-3 py-2.5">
              <span className="flex-1 text-[10px] font-black uppercase tracking-wider text-primary">Σ</span>
              <span className="tnum w-[86px] shrink-0 text-right text-[11px] font-black text-emerald-300">{rupiah(tb.totalDr)}</span>
              <span className="tnum w-[86px] shrink-0 text-right text-[11px] font-black text-amber-300">{rupiah(tb.totalCr)}</span>
            </div>
          </div>
          <p className="mt-2 rounded-xl border border-border bg-card/50 px-3 py-2 text-[10px] leading-snug text-muted-foreground">
            {cash.liability >= 0
              ? `${t("finEquation")}: `
              : `${lang === "id" ? "Persamaan akuntansi: Kas + Piutang bersih = Laba" : "Accounting equation: Cash + Net receivable = Profit"}: `}
            <span className="tnum font-bold text-foreground">
              {cash.liability >= 0
                ? `${rupiahShort(cash.cash)} − ${rupiahShort(cash.liability)} = ${rupiahShort(cash.netIncome)}`
                : `${rupiahShort(cash.cash)} + ${rupiahShort(Math.abs(cash.liability))} = ${rupiahShort(cash.netIncome)}`}
            </span>
          </p>
        </motion.section>
      </div>

      {/* ── waterfall + BEP ── */}
      <div className="grid gap-4 md:grid-cols-12">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }} className={cn(CARD, "md:col-span-7")}>
          <CardHead icon={BarChart3} title={t("finWaterfallTitle")} sub={t("finWaterfallSub")} />
          <div className="flex h-[170px] items-end justify-around gap-3 px-1">
            {wf.map((w) => {
              const h = Math.max(3, (Math.abs(w.value) / wfMax) * 100);
              return (
                <div key={w.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <p className="tnum text-[10px] font-bold">{w.value === 0 ? "—" : `${w.value < 0 ? "−" : ""}${rupiahShort(Math.abs(w.value))}`}</p>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={cn("w-full max-w-[64px] rounded-t-lg", w.color)}
                  />
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{w.label}</p>
                </div>
              );
            })}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }} className={cn(CARD, "md:col-span-5")}>
          <CardHead
            icon={TrendingUp}
            title={t("finBepTitle")}
            right={
              <span data-bep-sessions className="tnum rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">
                {Number.isFinite(bep.bepSessions) ? `${bep.bepSessions} ${t("finBepSessions")}` : "∞"}
              </span>
            }
          />
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">{t("finBepFixed")}</p>
                <p className="tnum text-[11.5px] font-bold">{rupiahShort(fixedCost)}</p>
              </div>
              <input type="range" min={5_000_000} max={40_000_000} step={1_000_000} value={fixedCost} onChange={(e) => setFixedCost(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-[#FFD60A]" />
            </div>
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">{t("finBepVar")}</p>
                <p className="tnum text-[11.5px] font-bold">{rupiah(varCost)}</p>
              </div>
              <input type="range" min={500} max={10_000} step={500} value={varCost} onChange={(e) => setVarCost(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-[#FFD60A]" />
            </div>

            {/* revenue vs cost crossing at BEP */}
            <div className="overflow-hidden rounded-xl border border-border bg-card/50 p-2">
              <svg viewBox={`0 0 ${bw} ${bh}`} className="w-full" role="img" aria-label={t("finBepTitle")}>
                {/* cost line: fixed + var·x */}
                <line
                  x1={0}
                  y1={by(fixedCost)}
                  x2={bw}
                  y2={by(fixedCost + varCost * bepMaxX)}
                  className="stroke-red-400/80"
                  strokeWidth="2"
                />
                {/* revenue line */}
                <line x1={0} y1={by(0)} x2={bw} y2={by(arpu * bepMaxX)} className="stroke-emerald-400" strokeWidth="2" />
                {/* BEP dot */}
                {Number.isFinite(bep.bepSessions) && bep.bepSessions <= bepMaxX && (
                  <>
                    <circle cx={bx(bep.bepSessions)} cy={by(fixedCost + varCost * bep.bepSessions)} r="5" className="fill-primary stroke-[#0b1226]" strokeWidth="2" />
                    <line x1={bx(bep.bepSessions)} x2={bx(bep.bepSessions)} y1={by(fixedCost + varCost * bep.bepSessions)} y2={bh} className="stroke-primary/60" strokeWidth="1" strokeDasharray="3 3" />
                  </>
                )}
                {/* run-rate marker */}
                <line x1={bx(runRate)} x2={bx(runRate)} y1={0} y2={bh} className="stroke-sky-400/60" strokeWidth="1" strokeDasharray="2 4" />
              </svg>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-xl border border-border bg-card/50 px-2 py-1.5">
                <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">{t("finBepCm")}</p>
                <p className="tnum text-[11.5px] font-bold text-emerald-300">{rupiah(bep.cm)}</p>
              </div>
              <div className="rounded-xl border border-border bg-card/50 px-2 py-1.5">
                <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">{t("finBepRunrate")}</p>
                <p className="tnum text-[11.5px] font-bold text-sky-300">{runRate}</p>
              </div>
              <div className="rounded-xl border border-border bg-card/50 px-2 py-1.5">
                <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">{t("finBepSafety")}</p>
                <p className={cn("tnum text-[11.5px] font-bold", bep.safetyPct >= 0 ? "text-emerald-300" : "text-red-400")}>
                  {Number.isFinite(bep.safetyPct) ? `${bep.safetyPct >= 0 ? "+" : ""}${bep.safetyPct.toFixed(0)}%` : "—"}
                </p>
              </div>
            </div>
            {bep.cm <= 0 && (
              <p className="rounded-xl border border-amber-400/30 bg-amber-400/[0.08] px-3 py-2 text-[10px] font-bold text-amber-400">
                {t("finBepNever")}
              </p>
            )}
          </div>
        </motion.section>
      </div>

      {/* ── invoices + cashflow (v24) ── */}
      <div className="grid gap-4 md:grid-cols-12">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }} className={cn(CARD, "md:col-span-7")}>
          <CardHead
            icon={FileText}
            title={t("invTitle")}
            sub={t("invMethodNote")}
            right={<span className="tnum rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black text-primary">{recap.totals.count}</span>}
          />
          <div className="mb-3 grid grid-cols-4 gap-1.5">
            {[
              { label: t("invRecapInvoices"), value: String(recap.totals.count) },
              { label: t("invRecapDpp"), value: rupiahShort(recap.totals.dpp) },
              { label: t("invRecapPpn"), value: rupiahShort(recap.totals.ppn), gold: true },
              { label: t("invRecapMonth"), value: String(monthCount) },
            ].map((c) => (
              <div key={c.label} className={cn("rounded-xl border px-2 py-1.5 text-center", c.gold ? "border-primary/30 bg-primary/[0.08]" : "border-border bg-card/50")}>
                <p className={cn("tnum text-[11px] font-bold", c.gold && "text-primary")}>{c.value}</p>
                <p className="mt-0.5 text-[7.5px] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</p>
              </div>
            ))}
          </div>
          <div className="max-h-[260px] space-y-1.5 overflow-y-auto pr-1" data-invoice-list>
            {invoices.slice(0, 12).map((inv) => (
              <button
                key={inv.id}
                onClick={() => setInvOpen(inv)}
                data-invoice-row={inv.id}
                className="flex w-full items-center gap-2.5 rounded-xl border border-border/60 bg-card/30 px-3 py-2 text-left transition hover:bg-card/60"
              >
                <span className="tnum shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-[9px] font-black text-primary">{inv.id}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-bold leading-tight">{inv.buyer}</span>
                  <span className="tnum block truncate text-[9.5px] text-muted-foreground">{inv.item} · {inv.slot}</span>
                </span>
                <span className="tnum shrink-0 text-right">
                  <span className="block text-[11.5px] font-bold">{rupiah(inv.gross)}</span>
                  <span className="block text-[9px] text-muted-foreground">PPN {rupiah(inv.ppn)}</span>
                </span>
              </button>
            ))}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.25 }} className={cn(CARD, "md:col-span-5")}>
          <CardHead
            icon={LineChartIcon}
            title={t("cfTitle")}
            sub={t("cfMethod")}
            right={
              <div className="flex items-center gap-2 text-[9px] font-bold">
                <span className="flex items-center gap-1 text-emerald-400"><span className="h-[3px] w-3.5 rounded-full bg-emerald-400" />{t("cfActual")}</span>
                <span className="flex items-center gap-1 text-primary"><span className="h-[3px] w-3.5 rounded-full bg-primary" />{t("cfForecast")}</span>
              </div>
            }
          />
          <div className="mb-3 grid grid-cols-3 gap-1.5">
            {[
              { label: t("cfKpiTotal"), value: rupiahShort(cf.total), gold: true },
              { label: t("cfKpiAvg"), value: rupiahShort(cf.avg) },
              { label: t("cfKpiDelta"), value: `${cf.deltaPct >= 0 ? "+" : ""}${cf.deltaPct.toFixed(1)}%`, tone: cf.deltaPct >= 0 },
            ].map((c) => (
              <div key={c.label} className={cn("rounded-xl border px-2 py-1.5 text-center", c.gold ? "border-primary/30 bg-primary/[0.08]" : "border-border bg-card/50")}>
                <p className={cn("tnum text-[11px] font-bold", c.gold && "text-primary", c.tone === true && "text-emerald-300", c.tone === false && "text-amber-400")}>{c.value}</p>
                <p className="mt-0.5 text-[7.5px] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</p>
              </div>
            ))}
          </div>
          <svg viewBox={`0 0 ${cfW} ${cfH}`} className="w-full" role="img" aria-label={t("cfTitle")}>
            {[0, 0.5, 1].map((g) => (
              <line key={g} x1={cfPad.l} x2={cfW - cfPad.r} y1={cfPad.t + g * cfih} y2={cfPad.t + g * cfih} className="stroke-border" strokeWidth="1" strokeDasharray={g === 1 ? "0" : "2 4"} />
            ))}
            <path d={cfBandPath} className="fill-primary/[0.28] stroke-primary/50" strokeWidth="0.8" strokeDasharray="3 3" />
            <path d={cfActualLine} className="stroke-emerald-400" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
            <path d={cfForecastLine} className="stroke-primary" strokeWidth="2.2" fill="none" strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />
            {nowIdx >= 0 && (
              <line x1={cx(nowIdx)} x2={cx(nowIdx)} y1={cfPad.t - 3} y2={cfPad.t + cfih + 3} className="stroke-muted-foreground/50" strokeWidth="1" strokeDasharray="2 3" />
            )}
          </svg>
          <p className="mt-1.5 flex items-center justify-between text-[9px] text-muted-foreground/70">
            <span>{t("cfActual")} ×10 {lang === "id" ? "hari" : "days"}</span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-3 rounded-sm bg-primary/[0.28]" /> {t("cfBand")}
            </span>
          </p>
        </motion.section>
      </div>

      {/* invoice document dialog */}
      <Dialog open={!!invOpen} onOpenChange={(v) => !v && setInvOpen(null)}>
        <DialogContent className="max-w-[380px] rounded-3xl border-border bg-card/95 p-5 backdrop-blur-xl">
          {invOpen && <InvoiceDoc invoice={invOpen} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Invoice document — LUNAS-stamped PPN breakdown. */
function InvoiceDoc({ invoice }: { invoice: Invoice }) {
  const lang = useParkir((s) => s.lang);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  return (
    <>
      <DialogHeader className="space-y-1">
        <DialogTitle className="text-center font-display text-lg font-bold tracking-tight">
          {invoice.id}
        </DialogTitle>
        <DialogDescription className="text-center text-xs">
          {new Date(invoice.at).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </DialogDescription>
      </DialogHeader>

      <div className="relative mt-3 rounded-2xl border border-border bg-white/[0.03] p-4" data-invoice-doc>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{t("invBillTo")}</p>
            <p className="text-[12.5px] font-bold leading-tight">{invoice.buyer}</p>
            <p className="tnum text-[10px] text-muted-foreground">{invoice.plate} · {invoice.slot}</p>
          </div>
          <span className="rotate-6 rounded-lg border-2 border-emerald-500/70 px-2.5 py-1 text-[13px] font-black tracking-[0.2em] text-emerald-500 dark:text-emerald-400">
            {t("invPaid")}
          </span>
        </div>

        <div className="space-y-1.5 rounded-xl border border-border bg-card/50 px-3 py-2.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("invItem")}</span>
            <span className="font-bold">{invoice.item}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("invTotal")}</span>
            <span className="tnum font-bold">{rupiah(invoice.gross)}</span>
          </div>
        </div>

        <div className="mt-2 space-y-1.5 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.06] px-3 py-2.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("invDpp")}</span>
            <span className="tnum font-bold text-cyan-500 dark:text-cyan-300">{rupiah(invoice.dpp)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("invPpn")}</span>
            <span className="tnum font-bold text-amber-500 dark:text-amber-300">{rupiah(invoice.ppn)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-dashed border-border pt-1.5">
            <span className="font-bold">{t("invTotal")}</span>
            <span className="tnum font-display text-base font-black text-primary">{rupiah(invoice.dpp + invoice.ppn)}</span>
          </div>
        </div>
        <p className="mt-2.5 text-center text-[8.5px] leading-snug text-muted-foreground/70">{t("invMethodNote")}</p>
      </div>
    </>
  );
}
