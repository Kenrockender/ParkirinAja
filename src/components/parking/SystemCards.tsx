"use client";
/**
 * SystemCards (v24) — responsive architecture bands, 8-entity ERD (SVG in
 * h-scroll), tech stack rows, and the v18→v26 changelog timeline.
 */
import React from "react";
import { motion } from "framer-motion";
import { Boxes, Database, GitCommitHorizontal, Layers, MonitorSmartphone, Network } from "lucide-react";
import { useParkir } from "@/lib/store";
import { tr } from "@/lib/parking-data";
import { cn } from "@/lib/utils";

const CARD = "glass rounded-3xl p-4";

// ───────────────────────── architecture ─────────────────────────

export function ArchCard() {
  const lang = useParkir((s) => s.lang);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);

  const bands = [
    { icon: MonitorSmartphone, label: t("archClients"), items: t("archClientsVal"), tone: "border-sky-400/30 bg-sky-400/[0.06]", ico: "text-sky-400" },
    { icon: Network, label: t("archEdge"), items: t("archEdgeVal"), tone: "border-amber-400/30 bg-amber-400/[0.06]", ico: "text-amber-400" },
    { icon: Layers, label: t("archApp"), items: t("archAppVal"), tone: "border-primary/30 bg-primary/[0.07]", ico: "text-primary" },
    { icon: Database, label: t("archData"), items: t("archDataVal"), tone: "border-emerald-400/30 bg-emerald-400/[0.06]", ico: "text-emerald-400" },
  ];

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className={CARD} data-arch>
      <h3 className="mb-3 flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
        <Boxes className="h-4 w-4 text-primary" />
        {t("archTitle")}
      </h3>
      <div className="space-y-2">
        {bands.map((b, i) => (
          <div key={b.label}>
            <div className={cn("flex items-center gap-3 rounded-2xl border px-3.5 py-2.5", b.tone)}>
              <b.icon className={cn("h-4.5 w-4.5 shrink-0", b.ico)} />
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-bold leading-tight">{b.label}</p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{b.items}</p>
              </div>
            </div>
            {i < bands.length - 1 && (
              <div className="flex justify-center py-0.5">
                <span className="flex items-center gap-1 rounded-full border border-border bg-card/50 px-2 py-0.5 text-[7.5px] font-black uppercase tracking-wider text-muted-foreground">
                  {i === 1 ? "WSS · 3,4 dtk" : "HTTPS · JSON"} ↓
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.section>
  );
}

// ───────────────────────── ERD ─────────────────────────

const ERD_W = 648;
const ERD_H = 392;

/** entity boxes: [key, x, y, w, h, title, fields(PK first)] */
const ENTITIES: { key: string; x: number; y: number; w: number; h: number; title: string; fields: { f: string; pk?: boolean; fk?: boolean }[] }[] = [
  { key: "CAMPUS", x: 12, y: 12, w: 120, h: 74, title: "CAMPUS", fields: [{ f: "id PK", pk: true }, { f: "name" }, { f: "layout" }] },
  { key: "SLOT", x: 168, y: 12, w: 120, h: 88, title: "SLOT", fields: [{ f: "id PK", pk: true }, { f: "campusId FK", fk: true }, { f: "slotNumber" }, { f: "status" }] },
  { key: "USER", x: 324, y: 12, w: 120, h: 88, title: "USER", fields: [{ f: "id PK", pk: true }, { f: "name" }, { f: "email" }, { f: "role" }] },
  { key: "VEHICLE", x: 480, y: 12, w: 132, h: 88, title: "VEHICLE", fields: [{ f: "id PK", pk: true }, { f: "userId FK", fk: true }, { f: "brand" }, { f: "bodyType" }] },
  { key: "RESERVATION", x: 168, y: 150, w: 120, h: 118, title: "RESERVATION", fields: [{ f: "id PK", pk: true }, { f: "slotId FK", fk: true }, { f: "driverName" }, { f: "window" }, { f: "serviceFee" }, { f: "status" }] },
  { key: "TXN", x: 324, y: 150, w: 120, h: 103, title: "TXN", fields: [{ f: "id PK", pk: true }, { f: "type" }, { f: "amount" }, { f: "note" }] },
  { key: "AUDIT_ENTRY", x: 168, y: 300, w: 120, h: 80, title: "AUDIT_ENTRY", fields: [{ f: "id PK", pk: true }, { f: "action" }, { f: "actor · ip" }] },
  { key: "LIVE_EVENT", x: 324, y: 296, w: 120, h: 84, title: "LIVE_EVENT", fields: [{ f: "id PK", pk: true }, { f: "kind in/out" }, { f: "guest plate" }] },
];

/** relations: [fromKey, toKey, dashed?] */
const RELS: { from: string; to: string; dashed?: boolean }[] = [
  { from: "CAMPUS", to: "SLOT" },
  { from: "SLOT", to: "RESERVATION" },
  { from: "USER", to: "VEHICLE" },
  { from: "USER", to: "RESERVATION" },
  { from: "RESERVATION", to: "TXN" },
  { from: "AUDIT_ENTRY", to: "RESERVATION", dashed: true },
  { from: "LIVE_EVENT", to: "SLOT", dashed: true },
];

export function ErdCard() {
  const lang = useParkir((s) => s.lang);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);

  const byKey = (k: string) => ENTITIES.find((e) => e.key === k)!;
  const center = (e: { x: number; y: number; w: number; h: number }) => ({ cx: e.x + e.w / 2, cy: e.y + e.h / 2 });

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }} className={CARD} data-erd>
      <h3 className="mb-3 flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
        <Database className="h-4 w-4 text-primary" />
        {t("erdTitle")}
      </h3>
      <div className="slim-scroll overflow-x-auto">
        <svg viewBox={`0 0 ${ERD_W} ${ERD_H}`} width={ERD_W} height={ERD_H} className="mx-auto block" role="img" aria-label={t("erdTitle")}>
          {/* relations */}
          {RELS.map((r) => {
            const a = center(byKey(r.from));
            const b = center(byKey(r.to));
            return (
              <g key={`${r.from}-${r.to}`}>
                <line
                  x1={a.cx}
                  y1={a.cy}
                  x2={b.cx}
                  y2={b.cy}
                  className={r.dashed ? "stroke-muted-foreground/60" : "stroke-primary/70"}
                  strokeWidth="1.4"
                  strokeDasharray={r.dashed ? "4 4" : undefined}
                />
                <text x={(a.cx + b.cx) / 2} y={(a.cy + b.cy) / 2 - 4} textAnchor="middle" className="fill-muted-foreground" fontSize="8" fontWeight="700">
                  {t("erdCardinality")}
                </text>
              </g>
            );
          })}
          {/* entities */}
          {ENTITIES.map((e) => (
            <g key={e.key}>
              <rect x={e.x} y={e.y} width={e.w} height={e.h} rx="10" className="fill-card stroke-primary/40" strokeWidth="1.4" />
              <rect x={e.x} y={e.y} width={e.w} height="20" rx="10" className="fill-primary/20" />
              <rect x={e.x} y={e.y + 10} width={e.w} height="10" className="fill-primary/20" />
              <text x={e.x + e.w / 2} y={e.y + 14} textAnchor="middle" className="fill-foreground" fontSize="9.5" fontWeight="800" letterSpacing="0.5">
                {e.title}
              </text>
              {e.fields.map((f, i) => (
                <text
                  key={f.f}
                  x={e.x + 9}
                  y={e.y + 34 + i * 15}
                  fontSize="8.5"
                  fontWeight={f.pk ? 800 : 500}
                  className={f.pk ? "fill-[#FFD60A]" : f.fk ? "fill-sky-400" : "fill-muted-foreground"}
                  fontFamily="ui-monospace, monospace"
                >
                  {f.f}
                </text>
              ))}
            </g>
          ))}
          {/* legend */}
          <g>
            <rect x={480} y={300} width="156" height="80" rx="10" className="fill-card/60 stroke-border" />
            <text x={492} y={316} fontSize="8.5" fontWeight="800" className="fill-[#FFD60A]">PK — primary key</text>
            <text x={492} y={331} fontSize="8.5" fontWeight="800" className="fill-sky-400">FK — foreign key</text>
            <text x={492} y={346} fontSize="8.5" className="fill-muted-foreground">— 1 : n relation</text>
            <text x={492} y={361} fontSize="8.5" className="fill-muted-foreground">- - actor · target (audit)</text>
          </g>
        </svg>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground/70">{t("erdNote")}</p>
    </motion.section>
  );
}

// ───────────────────────── stack ─────────────────────────

export function StackCard() {
  const lang = useParkir((s) => s.lang);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const rows = [
    { k: "Framework", v: "Next.js 16 · App Router · React 19" },
    { k: "Language", v: "TypeScript 5 (strict)" },
    { k: "Styling", v: "Tailwind CSS 4 · shadcn/ui · Framer Motion" },
    { k: "State", v: "Zustand 5 (client simulation store)" },
    { k: "Charts", v: "Hand-rolled SVG (no chart library)" },
    { k: "QR & Payments", v: "qrcode.react · Luhn · QRIS EMV-lite" },
    { k: "ORM (siap DB)", v: "Prisma 6" },
    { k: "Quality", v: "tsc strict · ESLint 9 · Playwright e2e" },
  ];
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }} className={CARD} data-stack>
      <h3 className="mb-3 flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
        <Layers className="h-4 w-4 text-primary" />
        {t("stackTitle")}
      </h3>
      <div className="overflow-hidden rounded-xl border border-border">
        {rows.map((r, i) => (
          <div key={r.k} className={cn("flex items-center gap-3 px-3 py-2", i !== rows.length - 1 && "border-b border-border/50")}>
            <span className="w-32 shrink-0 text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">{r.k}</span>
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{r.v}</span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

// ───────────────────────── changelog ─────────────────────────

export function ChangelogCard() {
  const lang = useParkir((s) => s.lang);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const releases = [
    { v: "v26", key: "chgV26" as const },
    { v: "v25", key: "chgV25" as const },
    { v: "v24", key: "chgV24" as const },
    { v: "v23", key: "chgV23" as const },
    { v: "v22", key: "chgV22" as const },
    { v: "v21", key: "chgV21" as const },
    { v: "v20", key: "chgV20" as const },
    { v: "v19", key: "chgV19" as const },
    { v: "v18", key: "chgV18" as const },
  ];
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }} className={CARD} data-changelog>
      <h3 className="mb-3 flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
        <GitCommitHorizontal className="h-4 w-4 text-primary" />
        {t("chgTitle")}
      </h3>
      <div className="relative space-y-3 pl-5">
        <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />
        {releases.map((r, i) => (
          <div key={r.v} className="relative">
            <span
              aria-hidden
              className={cn(
                "absolute -left-5 top-1 h-3.5 w-3.5 rounded-full border-2",
                i === 0 ? "border-primary bg-primary/40" : "border-border bg-card"
              )}
            />
            <p className="text-[11px] font-black tracking-wide text-primary">{r.v}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{t(r.key)}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
