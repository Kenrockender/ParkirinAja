"use client";
/**
 * WalletView — gradient balance card, quick chips + custom-amount top-up (v25),
 * and the v26 TopUpDialog payment flow: bank Virtual Account (8 banks, real
 * issuer prefixes, copyable 16-digit number), credit/debit card (live preview +
 * genuine Luhn/expiry validation), and QRIS (scannable QR). All simulated —
 * every method is recorded on the transaction note.
 */
import React from "react";
import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  Banknote,
  Building2,
  Check,
  Copy,
  CreditCard,
  Landmark,
  Loader2,
  Plus,
  QrCode,
  QrCode as QrIcon,
  Smartphone,
  TimerReset,
  Wallet as WalletIcon,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useParkir } from "@/lib/store";
import {
  cardBrand,
  expiryValid,
  formatCardNumber,
  groupVa,
  luhnValid,
  qrisPayload,
  rupiah,
  tr,
  vaNumberFor,
  VA_BANKS,
  type Txn,
  type TxnType,
  type VaBank,
} from "@/lib/parking-data";
import { cn } from "@/lib/utils";

const TXN_ICON: Record<TxnType, React.ComponentType<{ className?: string }>> = {
  TOP_UP: Plus,
  SERVICE_FEE: QrIcon,
  OVERTIME: TimerReset,
  REFUND: ArrowDownLeft,
};

// ── Real bank logo SVGs ───────────────────────────────────────────────────────

function BankLogo({ id, className }: { id: string; className?: string }) {
  // Each logo is a minimal inline SVG faithfully representing the bank's mark
  if (id === "bca") return (
    <svg viewBox="0 0 48 20" className={className} aria-label="BCA">
      <rect width="48" height="20" rx="3" fill="#0d5bb5" />
      <text x="24" y="14.5" textAnchor="middle" fill="white" fontSize="9" fontWeight="800" fontFamily="Arial,sans-serif">BCA</text>
    </svg>
  );
  if (id === "mandiri") return (
    <svg viewBox="0 0 56 20" className={className} aria-label="Mandiri">
      <rect width="56" height="20" rx="3" fill="#123e7c" />
      {/* Mandiri's characteristic yellow wave bar */}
      <rect x="0" y="14" width="56" height="6" rx="3" fill="#f0a500" />
      <text x="28" y="11" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="800" fontFamily="Arial,sans-serif">mandiri</text>
    </svg>
  );
  if (id === "bni") return (
    <svg viewBox="0 0 48 20" className={className} aria-label="BNI">
      <rect width="48" height="20" rx="3" fill="#f28f2a" />
      <text x="24" y="14.5" textAnchor="middle" fill="white" fontSize="9" fontWeight="800" fontFamily="Arial,sans-serif">BNI</text>
    </svg>
  );
  if (id === "bri") return (
    <svg viewBox="0 0 48 20" className={className} aria-label="BRI">
      <rect width="48" height="20" rx="3" fill="#1a5fa8" />
      <text x="24" y="14.5" textAnchor="middle" fill="white" fontSize="9" fontWeight="800" fontFamily="Arial,sans-serif">BRI</text>
    </svg>
  );
  if (id === "cimb") return (
    <svg viewBox="0 0 56 20" className={className} aria-label="CIMB Niaga">
      <rect width="56" height="20" rx="3" fill="#b91c3c" />
      <text x="28" y="14" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="800" fontFamily="Arial,sans-serif">CIMB</text>
    </svg>
  );
  if (id === "danamon") return (
    <svg viewBox="0 0 60 20" className={className} aria-label="Danamon">
      <rect width="60" height="20" rx="3" fill="#00497f" />
      <text x="30" y="14" textAnchor="middle" fill="white" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">Danamon</text>
    </svg>
  );
  if (id === "permata") return (
    <svg viewBox="0 0 60 20" className={className} aria-label="Permata">
      <rect width="60" height="20" rx="3" fill="#2f7d4f" />
      <text x="30" y="14" textAnchor="middle" fill="white" fontSize="7" fontWeight="800" fontFamily="Arial,sans-serif">Permata</text>
    </svg>
  );
  if (id === "bsi") return (
    <svg viewBox="0 0 48 20" className={className} aria-label="BSI">
      <rect width="48" height="20" rx="3" fill="#1e7d6f" />
      <text x="24" y="14.5" textAnchor="middle" fill="white" fontSize="9" fontWeight="800" fontFamily="Arial,sans-serif">BSI</text>
    </svg>
  );
  // fallback
  return <span className={className}>{id.toUpperCase()}</span>;
}

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000];
const MIN_TOPUP = 10_000;
const MAX_TOPUP = 10_000_000;

type PayMethod = "va" | "card" | "qris";
type PayStage = "method" | "va" | "va-pay" | "card" | "qris" | "processing" | "done";

export function WalletView() {
  const lang = useParkir((s) => s.lang);
  const balance = useParkir((s) => s.walletBalance);
  const transactions = useParkir((s) => s.transactions);
  const topUp = useParkir((s) => s.topUp);
  const toast = useParkir((s) => s.toast);
  const user = useParkir((s) => s.user);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(0);
  const [custom, setCustom] = React.useState("");
  const [customErr, setCustomErr] = React.useState<string | null>(null);

  function openTopUp(value: number) {
    setAmount(value);
    setDialogOpen(true);
  }

  function submitCustom() {
    const raw = custom.replace(/\D/g, "");
    if (!raw) return;
    const value = Number(raw);
    if (value < MIN_TOPUP) {
      setCustomErr(t("topUpMinErr"));
      return;
    }
    if (value > MAX_TOPUP) {
      setCustomErr(t("topUpMaxErr"));
      return;
    }
    setCustomErr(null);
    setCustom("");
    openTopUp(value);
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

          {/* quick chips (v25) — open the payment dialog */}
          <div className="mt-5 grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => openTopUp(a)}
                data-topup-chip={a}
                className="flex items-center justify-center gap-1 rounded-xl border border-primary/40 bg-primary/15 py-2.5 text-[11px] font-bold text-primary transition-all hover:bg-primary/25 active:scale-[0.97]"
              >
                <Plus className="h-3 w-3" />
                {(a / 1000).toLocaleString("id-ID")}rb
              </button>
            ))}
          </div>

          {/* custom amount (v25) */}
          <div className="mt-2.5 flex gap-2" data-topup-custom>
            <div className="relative flex-1">
              <Banknote className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                value={custom}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  setCustom(digits.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
                  if (customErr) setCustomErr(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && submitCustom()}
                placeholder={t("topUpCustomPh")}
                aria-label={t("topUpCustom")}
                className={cn(
                  "tnum h-11 w-full rounded-xl border bg-white/[0.06] pl-9 pr-3 text-[13px] font-bold text-white placeholder:font-normal placeholder:text-white/30 focus:outline-none transition",
                  customErr ? "border-amber-400/70" : "border-white/15 focus:border-primary/60"
                )}
              />
            </div>
            <button
              onClick={submitCustom}
              disabled={!custom}
              data-topup-custom-btn
              className="glow-primary flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("topUpCustom")}
            </button>
          </div>
          {customErr && (
            <p data-topup-custom-err className="mt-1.5 text-[11px] font-semibold text-amber-400">
              {customErr}
            </p>
          )}
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

      <TopUpDialog
        open={dialogOpen}
        amount={amount}
        onOpenChange={(v) => setDialogOpen(v)}
        onSettled={(note) => {
          topUp(amount, note);
          toast(`${t("payDone")} · +${rupiah(amount)}`, "success");
        }}
      />
    </div>
  );
}

// ───────────────────────── TopUpDialog (v26) ─────────────────────────

function TopUpDialog({
  open,
  amount,
  onOpenChange,
  onSettled,
}: {
  open: boolean;
  amount: number;
  onOpenChange: (v: boolean) => void;
  onSettled: (note: string) => void;
}) {
  const lang = useParkir((s) => s.lang);
  const toast = useParkir((s) => s.toast);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const [stage, setStage] = React.useState<PayStage>("method");
  const [bank, setBank] = React.useState<VaBank | null>(null);
  const [vaNumber, setVaNumber] = React.useState("");
  const [vaExpires, setVaExpires] = React.useState<Date | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [settledNote, setSettledNote] = React.useState("");

  // card form state
  const [cardNo, setCardNo] = React.useState("");
  const [cardName, setCardName] = React.useState("");
  const [cardExp, setCardExp] = React.useState("");
  const [cardCvv, setCardCvv] = React.useState("");
  const [cardErrors, setCardErrors] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (open) {
      setStage("method");
      setBank(null);
      setCopied(false);
      setSettledNote("");
      setCardNo("");
      setCardName("");
      setCardExp("");
      setCardCvv("");
      setCardErrors({});
    }
  }, [open, amount]);

  function pickBank(b: VaBank) {
    setBank(b);
    // per (bank, amount) deterministic VA number — same inputs, same number
    let s = (amount + b.prefix.length * 7) % 233280;
    const seedRand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    setVaNumber(vaNumberFor(b.prefix, amount, seedRand));
    setVaExpires(new Date(Date.now() + 24 * 3600_000));
    setStage("va-pay");
  }

  function copyVa() {
    const done = () => {
      setCopied(true);
      toast(t("payCopied"), "success");
      setTimeout(() => setCopied(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(vaNumber).then(done).catch(() => {
        fallbackCopy(vaNumber);
        done();
      });
    } else {
      fallbackCopy(vaNumber);
      done();
    }
  }

  function fallbackCopy(text: string) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch {
      /* noop */
    }
    ta.remove();
  }

  function settle(note: string) {
    setStage("processing");
    setTimeout(() => {
      setSettledNote(note);
      onSettled(note);
      setStage("done");
    }, 1100);
  }

  function submitCard() {
    const errs: Record<string, boolean> = {
      number: !luhnValid(cardNo),
      name: cardName.trim().length < 3,
      exp: !expiryValid(cardExp),
      cvv: !/^\d{3}$/.test(cardCvv),
    };
    setCardErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    const last4 = cardNo.replace(/\D/g, "").slice(-4);
    settle(`Kartu •••• ${last4}`);
  }

  const inputCls = (bad?: boolean, tnum = true) =>
    `${tnum ? "tnum " : ""}h-11 w-full rounded-xl border bg-white/[0.05] px-3.5 text-[13px] font-bold ${tnum ? "tracking-wide " : ""}placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground/40 focus:outline-none transition ${
      bad ? "border-red-400/70 focus:border-red-400" : "border-border focus:border-primary/50"
    }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-3xl border-border bg-card/95 p-5 backdrop-blur-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-center font-display text-lg font-bold tracking-tight">
            {stage === "done" ? t("payDone") : stage === "method" ? t("payDialogTitle") : `${rupiah(amount)}`}
          </DialogTitle>
          <DialogDescription className="text-center text-xs leading-snug text-muted-foreground">
            {stage === "done" ? `${settledNote} · +${rupiah(amount)}` : stage === "method" ? t("payDialogSub") : null}
          </DialogDescription>
        </DialogHeader>

        {stage === "method" && (
          <div data-pay-methods className="mt-4 space-y-2">
            {(
              [
                { k: "va" as PayMethod, icon: Landmark, title: t("payVa"), sub: t("payVaSub") },
                { k: "card" as PayMethod, icon: CreditCard, title: t("payCard"), sub: t("payCardSub") },
                { k: "qris" as PayMethod, icon: Smartphone, title: t("payQris"), sub: t("payQrisSub") },
              ] as const
            ).map((m) => (
              <button
                key={m.k}
                data-pay-method={m.k}
                onClick={() => {
                  if (m.k === "va") setStage("va");
                  else if (m.k === "card") setStage("card");
                  else setStage("qris");
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card/50 p-3.5 text-left transition hover:border-primary/40 hover:bg-card/80 active:scale-[0.99]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                  <m.icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-tight">{m.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{m.sub}</span>
                </span>
                <span className="tnum shrink-0 text-sm font-black text-primary">{rupiah(amount)}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── VA flow ── */}
        {stage === "va" && (
          <div data-va-banks className="mt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {t("payVaPickBank")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {VA_BANKS.map((b) => (
                <button
                  key={b.id}
                  data-va-bank={b.short}
                  onClick={() => pickBank(b)}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-card/50 px-3 py-2.5 text-left transition hover:border-primary/40 hover:bg-card/80 active:scale-[0.98]"
                >
                  <BankLogo id={b.id} className="h-5 w-10 shrink-0 rounded" />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold">{b.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === "va-pay" && bank && (
          <div data-va-number className="mt-4 space-y-3">
            <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-card/60 px-3 py-2.5">
              <BankLogo id={bank.id} className="h-6 w-12 shrink-0 rounded" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-bold">{bank.name}</p>
                <p className="text-[10px] text-muted-foreground">{bank.short} Virtual Account</p>
              </div>
              <button
                onClick={() => setStage("va")}
                className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] font-bold text-muted-foreground transition hover:text-foreground"
              >
                {lang === "id" ? "Ganti" : "Change"}
              </button>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-primary/[0.07] px-4 py-3.5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {t("payVaNumber")}
              </p>
              <p className="tnum mt-1.5 select-all font-display text-lg font-black tracking-wider text-primary">
                {groupVa(vaNumber)}
              </p>
              <button
                onClick={copyVa}
                data-va-copy
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary transition hover:bg-primary/20 active:scale-95"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? (lang === "id" ? "Tersalin" : "Copied") : t("payCopy")}
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-xs">
              <span className="text-muted-foreground">{lang === "id" ? "Jumlah" : "Amount"}</span>
              <span className="tnum font-black text-primary">{rupiah(amount)}</span>
            </div>
            {vaExpires && (
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-xs">
                <span className="text-muted-foreground">{t("payVaExpires")}</span>
                <span className="tnum font-bold">
                  {vaExpires.toLocaleString(lang === "id" ? "id-ID" : "en-US", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            <p className="rounded-xl border border-sky-400/25 bg-sky-400/[0.06] px-3 py-2.5 text-[11px] leading-relaxed text-sky-600 dark:text-sky-300">
              {t("payVaHowTo")}
            </p>
            <button
              onClick={() => settle(`VA ${bank.short}`)}
              data-va-check
              className="glow-primary flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black text-primary-foreground transition active:scale-[0.98]"
            >
              <Check className="h-4.5 w-4.5" />
              {t("payVaCheck")}
            </button>
          </div>
        )}

        {/* ── card flow ── */}
        {stage === "card" && (
          <div data-card-form className="mt-4 space-y-3">
            {/* live card preview */}
            <div
              className="relative aspect-[1.686/1] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#312e81] p-4 text-white shadow-lg"
            >
              <div aria-hidden className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-white/[0.08]" />
              <div aria-hidden className="absolute -bottom-16 -left-8 h-32 w-32 rounded-full bg-white/[0.06]" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className="h-7 w-9 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 shadow-inner" />
                  {(() => {
                    const brand = cardBrand(cardNo);
                    return brand ? (
                      <span className="text-sm font-black italic tracking-tight">{brand}</span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">
                        Parkir Pay
                      </span>
                    );
                  })()}
                </div>
                <p className="tnum font-display text-[17px] font-bold tracking-[0.12em]">
                  {formatCardNumber(cardNo) || "•••• •••• •••• ••••"}
                </p>
                <div className="flex items-end justify-between">
                  <div className="min-w-0">
                    <p className="text-[7.5px] font-bold uppercase tracking-[0.18em] text-white/50">
                      {t("payCardName")}
                    </p>
                    <p className="truncate text-[11px] font-bold uppercase">
                      {cardName || "NAMA LENGKAP"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[7.5px] font-bold uppercase tracking-[0.18em] text-white/50">
                      {t("payCardExpiry")}
                    </p>
                    <p className="tnum text-[11px] font-bold">{cardExp || "MM/YY"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {t("payCardNumber")}
              </p>
              <input
                value={formatCardNumber(cardNo)}
                onChange={(e) => {
                  setCardNo(e.target.value.replace(/\D/g, "").slice(0, 16));
                  if (cardErrors.number) setCardErrors({ ...cardErrors, number: false });
                }}
                inputMode="numeric"
                placeholder="4242 4242 4242 4242"
                data-card-number
                className={inputCls(cardErrors.number)}
              />
              {cardErrors.number && (
                <p className="mt-1 text-[10px] font-semibold text-red-400">{t("payCardInvalid")}</p>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {t("payCardName")}
              </p>
              <input
                value={cardName}
                onChange={(e) => {
                  setCardName(e.target.value);
                  if (cardErrors.name) setCardErrors({ ...cardErrors, name: false });
                }}
                placeholder="BUDI SANTOSO"
                data-card-name
                className={inputCls(cardErrors.name, false)}
              />
              {cardErrors.name && (
                <p className="mt-1 text-[10px] font-semibold text-red-400">{t("payCardNameErr")}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {t("payCardExpiry")}
                </p>
                <input
                  value={cardExp}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                    if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                    setCardExp(v);
                    if (cardErrors.exp) setCardErrors({ ...cardErrors, exp: false });
                  }}
                  inputMode="numeric"
                  placeholder="12/28"
                  data-card-expiry
                  className={inputCls(cardErrors.exp)}
                />
                {cardErrors.exp && (
                  <p className="mt-1 text-[10px] font-semibold text-red-400">{t("payCardExpErr")}</p>
                )}
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {t("payCardCvv")}
                </p>
                <input
                  value={cardCvv}
                  onChange={(e) => {
                    setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3));
                    if (cardErrors.cvv) setCardErrors({ ...cardErrors, cvv: false });
                  }}
                  inputMode="numeric"
                  type="password"
                  placeholder="•••"
                  data-card-cvv
                  className={inputCls(cardErrors.cvv)}
                />
                {cardErrors.cvv && (
                  <p className="mt-1 text-[10px] font-semibold text-red-400">{t("payCardCvvErr")}</p>
                )}
              </div>
            </div>

            <button
              onClick={submitCard}
              data-card-submit
              className="glow-primary flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black text-primary-foreground transition active:scale-[0.98]"
            >
              <CreditCard className="h-4.5 w-4.5" />
              {lang === "id" ? "Bayar" : "Pay"} {rupiah(amount)}
            </button>
            <button
              onClick={() => {
                setCardErrors({});
                setCardNo("");
                setCardName("");
                setCardExp("");
                setCardCvv("");
              }}
              className="mx-auto flex items-center gap-1 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" /> {t("close")}
            </button>
          </div>
        )}

        {/* ── QRIS flow ── */}
        {stage === "qris" && (
          <div data-qris className="mt-4 space-y-3">
            <div className="rounded-2xl bg-white p-4 text-center shadow-md">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded bg-[#0b1226] px-1.5 py-0.5 text-[8px] font-black tracking-widest text-white">
                  QRIS
                </span>
                <span className="rounded bg-red-600 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-white">
                  QRIS
                </span>
              </div>
              <QRCodeSVG
                value={qrisPayload(amount)}
                size={188}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                marginSize={1}
              />
              <p className="mt-2 text-[10px] font-black tracking-wide text-[#0b1226]">
                {t("payQrisMerchant")}
              </p>
              <p className="tnum text-[13px] font-black text-[#b91c1c]">Rp{amount.toLocaleString("id-ID")}</p>
            </div>
            <p className="text-center text-[11px] font-semibold text-muted-foreground">
              {t("payQrisTitle")}
            </p>
            <p className="text-center text-[10px] text-muted-foreground/70">{t("payQrisSub")}</p>
            <button
              onClick={() => settle("QRIS")}
              data-qris-check
              className="glow-primary flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black text-primary-foreground transition active:scale-[0.98]"
            >
              <Check className="h-4.5 w-4.5" />
              {t("payVaCheck")}
            </button>
          </div>
        )}

        {/* ── processing ── */}
        {stage === "processing" && (
          <div data-pay-processing className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-bold text-muted-foreground">{t("payProcessing")}</p>
          </div>
        )}

        {/* ── done ── */}
        {stage === "done" && (
          <div data-pay-done className="flex flex-col items-center gap-3 py-6">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15">
              <Check className="h-7 w-7 text-emerald-400" />
            </span>
            <p className="tnum font-display text-2xl font-black text-emerald-400">+{rupiah(amount)}</p>
            {settledNote && (
              <p className="rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-bold text-muted-foreground">
                {settledNote}
              </p>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="mt-1 flex h-11 w-full items-center justify-center rounded-2xl border border-border bg-card/60 text-sm font-bold transition hover:bg-card/90"
            >
              {t("close")}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
