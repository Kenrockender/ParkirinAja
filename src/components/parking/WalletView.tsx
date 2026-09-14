"use client";
/** WalletView — gradient balance card, top-up actions, transaction feed. */
import React from "react";
import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  Car,
  Plus,
  QrCode,
  TimerReset,
  Wallet as WalletIcon,
} from "lucide-react";
import { useParkir } from "@/lib/store";
import { rupiah, tr, type Txn, type TxnType } from "@/lib/parking-data";
import { cn } from "@/lib/utils";

const TXN_ICON: Record<TxnType, React.ComponentType<{ className?: string }>> = {
  TOP_UP: Plus,
  SERVICE_FEE: QrCode,
  PARKING_FEE: Car,
  OVERTIME: TimerReset,
  REFUND: ArrowDownLeft,
};

export function WalletView() {
  const lang = useParkir((s) => s.lang);
  const balance = useParkir((s) => s.walletBalance);
  const transactions = useParkir((s) => s.transactions);
  const topUp = useParkir((s) => s.topUp);
  const toast = useParkir((s) => s.toast);
  const user = useParkir((s) => s.user);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);

  const [busyAmount, setBusyAmount] = React.useState<number | null>(null);

  function doTopUp(amount: number) {
    if (busyAmount) return;
    setBusyAmount(amount);
    setTimeout(() => {
      topUp(amount);
      toast(`${t("topUpSuccess")} · ${rupiah(amount)}`, "success");
      setBusyAmount(null);
    }, 650);
  }

  const { today, earlier } = React.useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const today = transactions.filter((x) => x.createdAt >= startOfDay.getTime());
    const earlier = transactions.filter((x) => x.createdAt < startOfDay.getTime());
    return { today, earlier };
  }, [transactions]);

  const txnLabel: Record<TxnType, string> = {
    TOP_UP: t("tTopUp"),
    SERVICE_FEE: t("tServiceFee"),
    PARKING_FEE: t("tParkingFee"),
    OVERTIME: t("tOvertime"),
    REFUND: t("tRefund"),
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold tracking-tight">{t("walletTitle")}</h2>

      {/* balance hero */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#16223f] via-[#1a2c58] to-[#12284a] p-5 dark:border-white/10"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-binus-bright/25 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(115deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 14px)",
            }}
          />
        </div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
              <WalletIcon className="h-3.5 w-3.5" /> {t("balanceLabel")}
            </p>
            {user.isBinusian && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-black tracking-wider text-primary">
                {t("binusian")}
              </span>
            )}
          </div>
          <p className="tnum mt-3 font-display text-[2.75rem] font-bold leading-none tracking-tight text-white">
            {rupiah(balance)}
          </p>

          <div className="mt-5 flex gap-2">
            {[50000, 100000, 200000].map((a) => (
              <button
                key={a}
                onClick={() => doTopUp(a)}
                disabled={busyAmount === a}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all active:scale-[0.97]",
                  busyAmount === a
                    ? "border-white/10 bg-white/[0.06] text-white/50"
                    : "border-primary/40 bg-primary/15 text-primary hover:bg-primary/25"
                )}
              >
                {busyAmount === a ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {rupiah(a)}
              </button>
            ))}
          </div>
        </div>
      </motion.section>

      {/* transactions */}
      <section className="space-y-3">
        <h3 className="font-display text-sm font-bold tracking-tight">{t("transactions")}</h3>

        {transactions.length === 0 && (
          <p className="glass rounded-2xl px-4 py-8 text-center text-xs text-muted-foreground">
            {t("emptyTxn")}
          </p>
        )}

        {today.length > 0 && (
          <TxnGroup label={t("todayLabel")} items={today} txnLabel={txnLabel} lang={lang} />
        )}
        {earlier.length > 0 && (
          <TxnGroup label={t("earlierLabel")} items={earlier} txnLabel={txnLabel} lang={lang} />
        )}
      </section>
    </div>
  );
}

function TxnGroup({
  label,
  items,
  txnLabel,
  lang,
}: {
  label: string;
  items: Txn[];
  txnLabel: Record<TxnType, string>;
  lang: "id" | "en";
}) {
  return (
    <div className="space-y-1.5">
      <p className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
        {label}
      </p>
      <div className="glass overflow-hidden rounded-2xl">
        {items.map((x, i) => {
          const Icon = TXN_ICON[x.type];
          const credit = x.type === "TOP_UP" || x.type === "REFUND";
          return (
            <div
              key={x.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3",
                i !== items.length - 1 && "border-b border-border/60"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                  credit
                    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                    : "border-white/10 bg-white/[0.04] text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold leading-tight">
                  {txnLabel[x.type]}
                </p>
                <p className="tnum truncate text-[10.5px] text-muted-foreground">
                  {x.note ? `${x.note} · ` : ""}
                  {new Date(x.createdAt).toLocaleTimeString(lang === "id" ? "id-ID" : "en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <span
                className={cn(
                  "tnum shrink-0 text-[13px] font-bold",
                  credit ? "text-emerald-400" : "text-foreground"
                )}
              >
                {credit ? "+" : "−"}
                {rupiah(x.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
