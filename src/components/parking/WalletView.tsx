"use client";
/**
 * WalletView - gradient balance card, quick chips + custom-amount top-up (v25),
 * and the v26 TopUpDialog payment flow: bank Virtual Account (8 banks, real
 * issuer prefixes, copyable 16-digit number), credit/debit card (live preview +
 * genuine Luhn/expiry validation), and QRIS (scannable QR). All simulated -
 * every method is recorded on the transaction note.
 */
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  Banknote,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Landmark,
  Loader2,
  Plus,
  QrCode as QrIcon,
  Smartphone,
  TimerReset,
  Wallet as WalletIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotifBell } from "./NotifCenter";
import { useParkir } from "@/lib/store";
import {
  CARD_ADMIN_FEE,
  cardBrand,
  expiryValid,
  formatCardNumber,
  groupVa,
  luhnValid,
  qrisPayload,
  QRIS_ADMIN_FEE,
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

// ── Real bank logo assets ─────────────────────────────────────────────────────
/** v28 - user supplied the actual bank logo artwork in /logo/bank (each bank
 *  as a different file type: png/webp/svg). Copied into /public/bank-logos
 *  with normalized names so they can be referenced by id here. */
const BANK_LOGO_SRC: Record<string, string> = {
  bca: "/bank-logos/bca.png",
  mandiri: "/bank-logos/mandiri.webp",
  bni: "/bank-logos/bni.webp",
  bri: "/bank-logos/bri.webp",
  cimb: "/bank-logos/cimb.svg",
  danamon: "/bank-logos/danamon.svg",
  permata: "/bank-logos/permata.webp",
  bsi: "/bank-logos/bsi.webp",
};

function BankLogo({ id, className }: { id: string; className?: string }) {
  const src = BANK_LOGO_SRC[id];
  if (!src) return <span className={className}>{id.toUpperCase()}</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center overflow-hidden rounded-[3px] bg-white p-0.5",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={id.toUpperCase()} className="h-full w-full object-contain" draggable={false} />
    </span>
  );
}

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000];
const MIN_TOPUP = 10_000;
const MAX_TOPUP = 10_000_000;

type PayMethod = "va" | "card" | "qris";
/** v27 - "va"/"card"/"qris" no longer jump to a full-screen stage; they expand
 *  in place as an accordion under the method list. Only picking a bank (→ VA
 *  number screen) or settling a payment still advances to a dedicated stage. */
type PayStage = "method" | "va-pay" | "processing" | "done";

export function WalletView({ onOpenNotif }: { onOpenNotif: () => void }) {
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
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold tracking-tight">{t("walletTitle")}</h2>
        <NotifBell onOpen={onOpenNotif} />
      </div>

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

          {/* quick chips (v25) - open the payment dialog */}
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
  /** v27 - which method row is expanded open in the accordion (null = all collapsed). */
  const [expandedMethod, setExpandedMethod] = React.useState<PayMethod | null>(null);
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
      setExpandedMethod(null);
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
    // per (bank, amount) deterministic VA number - same inputs, same number
    let s = (amount + b.prefix.length * 7) % 233280;
    const seedRand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    setVaNumber(vaNumberFor(b.prefix, amount, seedRand));
    setVaExpires(new Date(Date.now() + 24 * 3600_000));
    setStage("va-pay");
  }

  function backToMethods() {
    setStage("method");
    setBank(null);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[400px] rounded-3xl border-border bg-card/95 p-5 backdrop-blur-xl",
          // v29 - cap the dialog to the viewport height and let it scroll
          // internally; without this the expanded method accordion (esp.
          // the VA bank list) could grow taller than the screen and get
          // clipped/overflow past the viewport ("nembus") instead of
          // scrolling in place.
          "max-h-[calc(100dvh-2rem)] overflow-y-auto"
        )}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-center font-display text-lg font-bold tracking-tight">
            {stage === "done" ? t("payDone") : stage === "method" ? t("payDialogTitle") : `${rupiah(amount)}`}
          </DialogTitle>
          <DialogDescription className="text-center text-xs leading-snug text-muted-foreground">
            {stage === "done" ? `${settledNote} · +${rupiah(amount)}` : stage === "method" ? t("payDialogSub") : null}
          </DialogDescription>
        </DialogHeader>

        {/* v27 - accordion: each method expands in place instead of navigating
            to a separate full-screen stage. Picking a bank inside the VA panel
            still advances to the dedicated "va-pay" (VA number) stage below. */}
        {stage === "method" && (
          <div data-pay-methods className="mt-4 space-y-2">
            {(
              [
                { k: "va" as PayMethod, icon: Landmark, title: t("payVa"), sub: t("payVaSub") },
                { k: "card" as PayMethod, icon: CreditCard, title: t("payCard"), sub: t("payCardSub") },
                { k: "qris" as PayMethod, icon: Smartphone, title: t("payQris"), sub: t("payQrisSub") },
              ] as const
            ).map((m) => {
              const isOpen = expandedMethod === m.k;
              return (
                <div
                  key={m.k}
                  className={cn(
                    "overflow-hidden rounded-2xl border transition-colors",
                    isOpen ? "border-primary/40 bg-card/80" : "border-border bg-card/50"
                  )}
                >
                  <button
                    data-pay-method={m.k}
                    aria-expanded={isOpen}
                    onClick={() => setExpandedMethod(isOpen ? null : m.k)}
                    className="flex w-full items-start gap-3 p-3.5 text-left transition hover:bg-card/80 active:scale-[0.99]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                      <m.icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold leading-tight">{m.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{m.sub}</span>
                      {/* v27 - real bank logo chips so VA is recognizable at a glance */}
                      {m.k === "va" && (
                        <span className="mt-1.5 flex items-center gap-1">
                          {["bca", "mandiri", "bni", "bri"].map((id) => (
                            <BankLogo key={id} id={id} className="h-4 w-9 shrink-0 rounded-[3px]" />
                          ))}
                          <span className="text-[9.5px] font-semibold text-muted-foreground">+4</span>
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1 self-center">
                      <span className="tnum text-sm font-black text-primary">{rupiah(amount)}</span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 text-muted-foreground transition-transform",
                          isOpen && "rotate-180 text-primary"
                        )}
                      />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border/60 p-3.5 pt-3">
                          {/* ── VA: vertical scrollable bank list, each with its own admin fee + total ── */}
                          {m.k === "va" && (
                            <div data-va-banks>
                              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                                {t("payVaPickBank")}
                              </p>
                              <div className="max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
                                {VA_BANKS.map((b) => (
                                  <button
                                    key={b.id}
                                    data-va-bank={b.short}
                                    onClick={() => pickBank(b)}
                                    className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card/60 px-3 py-2.5 text-left transition hover:border-primary/40 hover:bg-card active:scale-[0.98]"
                                  >
                                    <BankLogo id={b.id} className="h-5 w-10 shrink-0 rounded" />
                                    <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold">{b.name}</span>
                                    <span className="tnum shrink-0 text-right text-[9.5px] leading-tight text-muted-foreground">
                                      {t("payAdminFee")} {rupiah(b.adminFee)}
                                      <br />
                                      <span className="font-bold text-primary">{rupiah(amount + b.adminFee)}</span>
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ── Card: inline form ── */}
                          {m.k === "card" && <CardForm
                            amount={amount}
                            lang={lang}
                            cardNo={cardNo}
                            cardName={cardName}
                            cardExp={cardExp}
                            cardCvv={cardCvv}
                            cardErrors={cardErrors}
                            setCardNo={setCardNo}
                            setCardName={setCardName}
                            setCardExp={setCardExp}
                            setCardCvv={setCardCvv}
                            setCardErrors={setCardErrors}
                            onSubmit={submitCard}
                            t={t}
                          />}

                          {/* ── QRIS: scannable code ── */}
                          {m.k === "qris" && (
                            <QrisPanel amount={amount} lang={lang} t={t} onPaid={() => settle("QRIS")} />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
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
                onClick={backToMethods}
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

            <div className="space-y-1.5 rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{lang === "id" ? "Jumlah" : "Amount"}</span>
                <span className="tnum font-bold">{rupiah(amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("payAdminFee")}</span>
                <span className="tnum font-bold">{rupiah(bank.adminFee)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-1.5">
                <span className="font-bold text-muted-foreground">{t("payTotalDue")}</span>
                <span className="tnum font-black text-primary">{rupiah(amount + bank.adminFee)}</span>
              </div>
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
            <p className="rounded-xl border border-blue-400/25 bg-blue-400/[0.06] px-3 py-2.5 text-[11px] leading-relaxed text-blue-600 dark:text-blue-300">
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
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-400/15">
              <Check className="h-7 w-7 text-green-400" />
            </span>
            <p className="tnum font-display text-2xl font-black text-green-400">+{rupiah(amount)}</p>
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

// ───────────────────────── Card form (v27 - inline accordion panel) ─────────────────────────

function CardForm({
  amount,
  lang,
  cardNo,
  cardName,
  cardExp,
  cardCvv,
  cardErrors,
  setCardNo,
  setCardName,
  setCardExp,
  setCardCvv,
  setCardErrors,
  onSubmit,
  t,
}: {
  amount: number;
  lang: "id" | "en";
  cardNo: string;
  cardName: string;
  cardExp: string;
  cardCvv: string;
  cardErrors: Record<string, boolean>;
  setCardNo: (v: string) => void;
  setCardName: (v: string) => void;
  setCardExp: (v: string) => void;
  setCardCvv: (v: string) => void;
  setCardErrors: (v: Record<string, boolean>) => void;
  onSubmit: () => void;
  t: (k: Parameters<typeof tr>[1]) => string;
}) {
  const inputCls = (bad?: boolean, tnum = true) =>
    `${tnum ? "tnum " : ""}h-11 w-full rounded-xl border bg-white/[0.05] px-3.5 text-[13px] font-bold ${tnum ? "tracking-wide " : ""}placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground/40 focus:outline-none transition ${
      bad ? "border-red-400/70 focus:border-red-400" : "border-border focus:border-primary/50"
    }`;

  return (
    <div data-card-form className="space-y-3">
      {/* live card preview */}
      <div className="relative aspect-[1.686/1] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#312e81] p-4 text-white shadow-lg">
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

      <div className="space-y-1.5 rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("payAdminFee")}</span>
          <span className="tnum font-bold">{rupiah(CARD_ADMIN_FEE)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-1.5">
          <span className="font-bold text-muted-foreground">{t("payTotalDue")}</span>
          <span className="tnum font-black text-primary">{rupiah(amount + CARD_ADMIN_FEE)}</span>
        </div>
      </div>

      <button
        onClick={onSubmit}
        data-card-submit
        className="glow-primary flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black text-primary-foreground transition active:scale-[0.98]"
      >
        <CreditCard className="h-4.5 w-4.5" />
        {lang === "id" ? "Bayar" : "Pay"} {rupiah(amount + CARD_ADMIN_FEE)}
      </button>
    </div>
  );
}

// ───────────────────────── QRIS panel (v27 - redesigned inline accordion panel) ─────────────────────────

function QrisPanel({
  amount,
  lang,
  t,
  onPaid,
}: {
  amount: number;
  lang: "id" | "en";
  t: (k: Parameters<typeof tr>[1]) => string;
  onPaid: () => void;
}) {
  return (
    <div data-qris className="space-y-3">
      {/* QRIS card - white ticket-style panel, matching real QRIS branding conventions */}
      <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-md">
        <div className="flex items-center justify-between bg-[#0F172A] px-4 py-2">
          <span className="text-[10px] font-black tracking-[0.16em] text-white">QRIS</span>
          <span className="rounded bg-red-600 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-white">
            {lang === "id" ? "STANDAR" : "STANDARD"}
          </span>
        </div>
        <div className="flex flex-col items-center gap-3 px-5 py-5">
          <div className="rounded-xl border border-[#e5e7eb] p-2.5">
            <QRCodeSVG
              value={qrisPayload(amount + QRIS_ADMIN_FEE)}
              size={172}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
              marginSize={0}
            />
          </div>
          <div className="text-center">
            <p className="text-[11px] font-black leading-tight text-[#0F172A]">
              {t("payQrisMerchant")}
            </p>
            <p className="tnum mt-0.5 text-[15px] font-black text-[#b91c1c]">
              {rupiah(amount + QRIS_ADMIN_FEE)}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[#e5e7eb] px-4 py-2 text-[10px]">
          <span className="text-[#6b7280]">
            {t("payAdminFee")} {rupiah(QRIS_ADMIN_FEE)}
          </span>
          <span className="font-bold text-[#0F172A]">
            {t("payTotalDue")} {rupiah(amount + QRIS_ADMIN_FEE)}
          </span>
        </div>
        {/* supported wallets strip - visually anchors "scan with any app" */}
        <div className="flex items-center justify-center gap-1.5 border-t border-[#e5e7eb] bg-[#fafafa] px-4 py-2">
          {["GoPay", "OVO", "DANA", "ShopeePay"].map((w) => (
            <span
              key={w}
              className="rounded-full border border-[#e5e7eb] bg-white px-2 py-0.5 text-[8.5px] font-bold text-[#4b5563]"
            >
              {w}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2.5">
        <QrIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold leading-snug">{t("payQrisTitle")}</p>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{t("payQrisSub")}</p>
        </div>
      </div>

      <button
        onClick={onPaid}
        data-qris-check
        className="glow-primary flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black text-primary-foreground transition active:scale-[0.98]"
      >
        <Check className="h-4.5 w-4.5" />
        {t("payVaCheck")}
      </button>
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
          // v28 - VA top-ups are recorded as "VA <short>" (e.g. "VA BCA"); match
          // it back to the bank so the history shows its real logo + full name
          // instead of just the bare short code.
          const vaBank = x.note?.startsWith("VA ")
            ? VA_BANKS.find((b) => x.note === `VA ${b.short}`)
            : undefined;
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
                    ? "border-green-400/25 bg-green-400/10 text-green-300"
                    : "border-white/10 bg-white/[0.04] text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold leading-tight">
                  {txnLabel[x.type]}
                </p>
                <p className="tnum flex items-center gap-1 truncate text-[10.5px] text-muted-foreground">
                  {vaBank && <BankLogo id={vaBank.id} className="h-3 w-6 shrink-0 rounded-[2px]" />}
                  {vaBank ? `${vaBank.name} · ` : x.note ? `${x.note} · ` : ""}
                  {new Date(x.createdAt).toLocaleTimeString(lang === "id" ? "id-ID" : "en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <span
                className={cn(
                  "tnum shrink-0 text-[13px] font-bold",
                  credit ? "text-green-400" : "text-foreground"
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
