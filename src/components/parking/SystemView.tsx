"use client";
/**
 * SystemView - operator "Sistem" tab (v24): REST API documentation with an
 * interactive playground. GET responses are built LIVE from real store state;
 * writes return 201 + simulated:true and never mutate the store.
 * Also hosts the ANPR console card (v19).
 */
import React from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  Lock,
  Play,
  Radio,
  ScanLine,
  Terminal,
  Zap,
} from "lucide-react";
import { useParkir } from "@/lib/store";
import {
  campusById,
  campusCodePrefix,
  demandNow,
  DEMAND_TIERS,
  maskPlate,
  rupiah,
  tr,
} from "@/lib/parking-data";
import { buildJournal, profitAndLoss, trialBalance } from "@/lib/ledger";
import { cn } from "@/lib/utils";

const CARD = "glass rounded-3xl p-4";

type Endpoint = {
  id: string;
  method: "GET" | "POST";
  path: string;
  descKey: Parameters<typeof tr>[1];
};

const ENDPOINTS: Endpoint[] = [
  { id: "slots", method: "GET", path: "/slots", descKey: "epSlots" },
  { id: "availability", method: "GET", path: "/availability", descKey: "epAvailability" },
  { id: "post-res", method: "POST", path: "/reservations", descKey: "epPostRes" },
  { id: "get-res", method: "GET", path: "/reservations", descKey: "epGetRes" },
  { id: "finance", method: "GET", path: "/finance/summary", descKey: "epFinance" },
  { id: "journal", method: "GET", path: "/finance/journal", descKey: "epJournal" },
  { id: "live", method: "GET", path: "/live/events", descKey: "epLive" },
  { id: "health", method: "GET", path: "/system/health", descKey: "epHealth" },
];

export function SystemView() {
  const lang = useParkir((s) => s.lang);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const toast = useParkir((s) => s.toast);
  const [running, setRunning] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ endpoint: Endpoint; status: number; latency: number; body: string } | null>(null);

  function buildResponse(ep: Endpoint): { status: number; body: unknown } {
    const s = useParkir.getState();
    const campus = campusById(s.campusId);
    switch (ep.id) {
      case "slots": {
        return {
          status: 200,
          body: {
            campus: campus.id,
            layout: campus.layout,
            count: s.slots.length,
            slots: s.slots.slice(0, 6).map((sl) => ({
              id: sl.id,
              slotNumber: sl.slotNumber,
              status: sl.status,
            })),
          },
        };
      }
      case "availability": {
        const demand = demandNow(s.slots, s.reservations);
        return {
          status: 200,
          body: {
            campus: campus.id,
            tier: demand.tier,
            occupancyPct: demand.pct,
            pricing: DEMAND_TIERS[demand.tier],
            available: s.slots.filter(
              (sl) => sl.status === "ACTIVE" && !s.reservations.some((r) => r.slotId === sl.id && r.status === "CHECKED_IN")
            ).length,
          },
        };
      }
      case "post-res": {
        return {
          status: 201,
          body: {
            simulated: true,
            message: "Writes are simulated in the UI preview - nothing was mutated.",
            example: {
              slotId: "slot-A-03",
              type: "ADVANCE",
              startTime: "08:00",
              endTime: "10:00",
              serviceFee: DEMAND_TIERS.NORMAL.advanceFee,
            },
          },
        };
      }
      case "get-res": {
        return {
          status: 200,
          body: {
            count: s.reservations.length,
            reservations: s.reservations.slice(0, 4).map((r) => ({
              code: r.code,
              slot: r.slotNumber,
              status: r.status,
              driver: maskPlate(r.vehiclePlate),
            })),
          },
        };
      }
      case "finance": {
        const journal = buildJournal(s.transactions);
        const tb = trialBalance(journal);
        const pl = profitAndLoss(journal);
        return {
          status: 200,
          body: {
            revenue: { service: pl.service, fines: pl.fines, refunds: pl.refunds, net: pl.netIncome },
            trialBalance: { totalDr: tb.totalDr, totalCr: tb.totalCr, balanced: tb.balanced },
            wallet: { balance: s.walletBalance, arpu: pl.service / Math.max(1, s.transactions.filter((x) => x.type === "SERVICE_FEE").length) },
          },
        };
      }
      case "journal": {
        const journal = buildJournal(s.transactions);
        return {
          status: 200,
          body: {
            entries: journal.slice(0, 3).map((e) => ({
              at: new Date(e.at).toISOString(),
              memo: e.memo,
              lines: e.lines,
            })),
            total: journal.length,
          },
        };
      }
      case "live": {
        return {
          status: 200,
          body: {
            connected: s.liveOn,
            status: s.liveStatus,
            latencyMs: s.liveLatency,
            events: s.liveEvents.slice(0, 4).map((e) => ({
              at: new Date(e.at).toISOString(),
              kind: e.kind,
              plate: maskPlate(e.plate),
              slot: e.slotNumber,
            })),
            guests: s.liveGuests.length,
          },
        };
      }
      case "health": {
        return {
          status: 200,
          body: {
            status: "ok",
            uptimeSec: Math.round(performance.now() / 1000),
            campus: campus.id,
            version: "v26",
          },
        };
      }
      default:
        return { status: 404, body: { error: "Not found" } };
    }
  }

  function run(ep: Endpoint) {
    setRunning(ep.id);
    setResult(null);
    // deterministic simulated latency: 12–34 ms
    const latency = 12 + (ep.id.length * 3) % 23;
    setTimeout(() => {
      const { status, body } = buildResponse(ep);
      setResult({ endpoint: ep, status, latency, body: JSON.stringify(body, null, 2) });
      setRunning(null);
    }, 220);
  }

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className={CARD}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
            <Terminal className="h-4 w-4 text-primary" />
            {t("apiTitle")}
          </h3>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{t("apiSub")}</p>
        </div>
        <span className="tnum shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black text-primary">8</span>
      </div>

      {/* meta chips */}
      <div className="mb-3 grid grid-cols-2 gap-1.5 md:grid-cols-4">
        {[
          { label: t("apiBaseUrl"), value: t("apiBaseUrlVal") },
          { label: t("apiAuth"), value: t("apiAuthVal") },
          { label: t("apiRate"), value: t("apiRateVal") },
          { label: t("apiErrors"), value: t("apiErrorsVal") },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-card/50 px-2.5 py-1.5">
            <p className="text-[7.5px] font-bold uppercase tracking-wider text-muted-foreground">{m.label}</p>
            <p className="mt-0.5 truncate text-[9.5px] font-bold">{m.value}</p>
          </div>
        ))}
      </div>

      {/* endpoints */}
      <div className="space-y-1.5" data-api-endpoints>
        {ENDPOINTS.map((ep) => (
          <button
            key={ep.id}
            onClick={() => run(ep)}
            data-endpoint={ep.id}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition",
              running === ep.id
                ? "border-primary/50 bg-primary/[0.09]"
                : "border-border/60 bg-card/30 hover:bg-card/60"
            )}
          >
            <span
              className={cn(
                "tnum w-11 shrink-0 rounded-md px-1.5 py-0.5 text-center text-[9px] font-black",
                ep.method === "GET" ? "bg-green-400/15 text-green-400" : "bg-amber-400/15 text-amber-400"
              )}
            >
              {ep.method}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-[11px] font-bold">{ep.path}</span>
              <span className="block truncate text-[9.5px] text-muted-foreground">{t(ep.descKey)}</span>
            </span>
            <span className="shrink-0 text-[9px] font-bold text-muted-foreground/50">
              <Lock className="mr-0.5 inline h-2.5 w-2.5" />
              Bearer
            </span>
            {running === ep.id ? (
              <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            ) : (
              <Play className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            )}
          </button>
        ))}
      </div>

      {/* playground result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          data-playground-result
          className="mt-3 overflow-hidden rounded-2xl border border-border"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-card/60 px-3 py-2">
            <p className="flex items-center gap-2 font-mono text-[10.5px] font-bold">
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[9px] font-black",
                  result.status < 300 ? "bg-green-400/15 text-green-400" : "bg-amber-400/15 text-amber-400"
                )}
              >
                {result.status}
              </span>
              {result.endpoint.method} {result.endpoint.path}
            </p>
            <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground">
              <span className="tnum">{t("apiLatency")} {result.latency}ms</span>
              <button
                onClick={() => {
                  const curl = `curl -X ${result.endpoint.method} "${t("apiBaseUrlVal")}${result.endpoint.path}" \\\n  -H "Authorization: Bearer $TOKEN"`;
                  navigator.clipboard?.writeText(curl).catch(() => undefined);
                  toast(t("payCopied"), "success");
                }}
                className="rounded-full border border-border px-2 py-0.5 transition hover:text-foreground"
              >
                {t("apiCurl")}
              </button>
            </div>
          </div>
          <pre className="max-h-[260px] overflow-auto bg-[#0F172A] px-3.5 py-3 font-mono text-[10px] leading-relaxed text-green-200/90">
            {result.body}
          </pre>
          {result.endpoint.method === "POST" && (
            <p className="border-t border-border/60 bg-amber-400/[0.06] px-3 py-2 text-[10px] font-semibold text-amber-500 dark:text-amber-300">
              {t("apiSimNote")}
            </p>
          )}
        </motion.div>
      )}

      {/* ANPR console (v19) - camera → OCR → gate decision */}
      <AnprCard />
    </motion.section>
  );
}

/** ANPR console - simulated plate-recognition pipeline. */
function AnprCard() {
  const lang = useParkir((s) => s.lang);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const [log, setLog] = React.useState<{ plate: string; conf: number; allow: boolean; at: number }[]>([]);

  const PLATES = ["B 2741 AKL", "B 5512 MNH", "B 8625 JKT", "F 1902 QWE", "B 4419 QWE", "B 1123 PAS"];

  function simulate() {
    const plate = PLATES[Math.floor(Math.random() * PLATES.length)];
    const conf = 88 + Math.floor(Math.random() * 11);
    const allow = conf >= 90;
    setLog((l) => [{ plate, conf, allow, at: Date.now() }, ...l].slice(0, 5));
  }

  return (
    <div className="mt-4 border-t border-border/60 pt-4" data-anpr>
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
            <ScanLine className="h-4 w-4 text-primary" />
            {t("anprTitle")}
          </h3>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{t("anprSub")}</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {/* camera frame */}
        <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-2xl border border-border bg-[#0F172A]">
          <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 5px)" }} />
          <Cpu className="h-8 w-8 text-primary/60" />
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-red-500/90 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" /> REC
          </span>
          <button
            onClick={simulate}
            data-anpr-scan
            className="glow-primary absolute bottom-2 right-2 flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-[10px] font-black text-primary-foreground transition active:scale-95"
          >
            <Zap className="h-3 w-3" />
            {t("anprScan")}
          </button>
        </div>
        {/* recognition log */}
        <div className="space-y-1.5" data-anpr-log>
          {log.length === 0 ? (
            <p className="flex h-full items-center justify-center rounded-xl border border-dashed border-border px-3 text-center text-[10px] text-muted-foreground">
              {t("anprLog")} - {t("anprScan")} ↓
            </p>
          ) : (
            log.map((l, i) => (
              <div
                key={l.at}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-2.5 py-1.5",
                  l.allow ? "border-green-400/25 bg-green-400/[0.06]" : "border-red-400/25 bg-red-400/[0.06]"
                )}
              >
                <span className="tnum flex-1 truncate text-[11px] font-bold">{l.plate}</span>
                <span className="tnum text-[9.5px] font-semibold text-muted-foreground">
                  {t("anprConfidence")} {l.conf}%
                </span>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider", l.allow ? "bg-green-400/20 text-green-400" : "bg-red-400/20 text-red-400")}>
                  {l.allow ? t("anprAllow") : t("anprDeny")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
