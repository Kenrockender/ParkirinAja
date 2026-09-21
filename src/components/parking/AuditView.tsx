"use client";
/**
 * AuditView — operator "Audit" tab (v23, v25 layout: no RBAC matrix).
 * Active session context + append-only audit log with severity filter.
 */
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CarFront,
  CircleAlert,
  ClipboardList,
  Fingerprint,
  Lock,
  UserRound,
  UserRoundPen,
  Wrench,
  LogIn,
  LogOut,
  CalendarPlus,
  XCircle,
  Banknote,
  ArrowLeftRight,
  Megaphone,
  KeyRound,
  TimerReset,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { useParkir, SESSION_ID } from "@/lib/store";
import { tr, type AuditAction, type AuditEntry } from "@/lib/parking-data";
import { cn } from "@/lib/utils";

const CARD = "glass rounded-3xl p-4";

const ACTION_META: Record<AuditAction, { icon: React.ComponentType<{ className?: string }>; labelKey: Parameters<typeof tr>[1] }> = {
  SIGN_IN: { icon: KeyRound, labelKey: "aSignIn" },
  SIGN_OUT: { icon: LogOut, labelKey: "aSignOut" },
  BOOKING_CREATED: { icon: CalendarPlus, labelKey: "aBookingCreated" },
  BOOKING_CANCELLED: { icon: XCircle, labelKey: "aBookingCancelled" },
  REFUND_ISSUED: { icon: Banknote, labelKey: "aRefundIssued" },
  CHECK_IN: { icon: LogIn, labelKey: "aCheckIn" },
  CHECK_OUT: { icon: LogOut, labelKey: "aCheckOut" },
  WALK_IN_STARTED: { icon: ScanLine, labelKey: "aWalkInStarted" },
  FORCE_CHECKOUT: { icon: ShieldCheck, labelKey: "aForceCheckout" },
  SESSION_EXTENDED: { icon: TimerReset, labelKey: "aSessionExtended" },
  MANUAL_CHECKIN: { icon: UserRound, labelKey: "aManualCheckin" },
  TOP_UP: { icon: Banknote, labelKey: "aTopUp" },
  SLOT_MAINTENANCE: { icon: Wrench, labelKey: "aSlotMaintenance" },
  SLOT_REACTIVATED: { icon: Wrench, labelKey: "aSlotReactivated" },
  CAMPUS_SWITCHED: { icon: ArrowLeftRight, labelKey: "aCampusSwitched" },
  PROMO_BROADCAST: { icon: Megaphone, labelKey: "aPromoBroadcast" },
  PROFILE_UPDATE: { icon: UserRoundPen, labelKey: "aProfileUpdate" },
  ANPR_CHECKIN: { icon: ScanLine, labelKey: "anprTitle" },
};

const OPERATOR_ACTIONS = new Set<AuditAction>([
  "FORCE_CHECKOUT",
  "MANUAL_CHECKIN",
  "SLOT_MAINTENANCE",
  "SLOT_REACTIVATED",
  "PROMO_BROADCAST",
  "CAMPUS_SWITCHED",
]);

type AuditFilter = "all" | "ops" | "warn";

export function AuditView() {
  const lang = useParkir((s) => s.lang);
  const user = useParkir((s) => s.user);
  const auditLog = useParkir((s) => s.auditLog);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const [filter, setFilter] = React.useState<AuditFilter>("all");

  const filtered = React.useMemo(() => {
    const list = [...auditLog].sort((a, b) => b.at - a.at);
    if (filter === "ops") return list.filter((e) => OPERATOR_ACTIONS.has(e.action) || e.role === "OPERATOR");
    if (filter === "warn") return list.filter((e) => e.severity === "warning");
    return list;
  }, [auditLog, filter]);

  const filters: { k: AuditFilter; label: string; n: number }[] = [
    { k: "all", label: t("auditFilterAll"), n: auditLog.length },
    { k: "ops", label: t("auditFilterOps"), n: auditLog.filter((e) => OPERATOR_ACTIONS.has(e.action) || e.role === "OPERATOR").length },
    { k: "warn", label: t("auditFilterWarn"), n: auditLog.filter((e) => e.severity === "warning").length },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-12">
      {/* ── session context ── */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className={cn(CARD, "md:col-span-5")}>
        <div className="mb-3 flex items-center gap-1.5">
          <Fingerprint className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold tracking-tight">{t("auditSessionTitle")}</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.06] px-3.5 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <CarFront className="h-4.5 w-4.5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold leading-tight">{user.name}</p>
              <p className="truncate text-[10.5px] text-muted-foreground">{user.email}</p>
            </div>
            <span className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-primary">
              {user.role}
            </span>
          </div>
          {[
            { label: t("auditSessionId"), value: SESSION_ID },
            { label: t("auditIp"), value: "10.20.4.17" },
            { label: t("auditSso"), value: "SSO Microsoft" },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/50 px-3.5 py-2.5">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{r.label}</span>
              <span className="tnum min-w-0 truncate text-[11px] font-bold">{r.value}</span>
            </div>
          ))}
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] px-3.5 py-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <p className="text-[10.5px] leading-snug text-emerald-600 dark:text-emerald-300">
              {t("auditAppendNote")}
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── audit log ── */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }} className={cn(CARD, "md:col-span-7")}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight">
            <ClipboardList className="h-4 w-4 text-primary" />
            {t("auditLogTitle")}
          </h3>
          <div className="flex gap-1.5">
            {filters.map((f) => (
              <button
                key={f.k}
                onClick={() => setFilter(f.k)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[9.5px] font-bold transition",
                  filter === f.k
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border bg-card/50 text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label} <span className="tnum opacity-70">{f.n}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[430px] space-y-1.5 overflow-y-auto pr-1" data-audit-scroll>
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-8 text-center text-[11px] text-muted-foreground">
              {t("auditEmpty")}
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {filtered.slice(0, 60).map((e) => (
                <AuditRow key={e.id} entry={e} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.section>
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const lang = useParkir((s) => s.lang);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const meta = ACTION_META[entry.action];
  const Icon = meta.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      data-audit-action={entry.action}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-3 py-2",
        entry.severity === "warning"
          ? "border-amber-400/30 bg-amber-400/[0.06]"
          : "border-border/60 bg-card/30"
      )}
    >
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card/60">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {entry.severity === "warning" && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-1.5 text-[11.5px] font-bold leading-tight">
          <span className="truncate">{t(meta.labelKey)}</span>
          {entry.target && (
            <span className="tnum shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
              {entry.target}
            </span>
          )}
        </p>
        <p className="tnum truncate text-[9.5px] text-muted-foreground">
          {new Date(entry.at).toLocaleString(lang === "id" ? "id-ID" : "en-US", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}{" "}
          · {entry.actor} · {entry.role} · {entry.ip}
          {entry.detail ? ` · ${entry.detail}` : ""}
        </p>
      </div>
      {entry.severity === "warning" && (
        <CircleAlert className="h-3.5 w-3.5 shrink-0 text-amber-400" />
      )}
    </motion.div>
  );
}
