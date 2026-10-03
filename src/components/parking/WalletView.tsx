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
  ArrowUpRight,
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
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogClose,
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
  WITHDRAW: ArrowUpRight,
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

/** Some logo files carry lots of empty padding (BCA), so they render tiny next
 *  to the others - zoom those in so every bank looks the same size. */
const BANK_LOGO_ZOOM: Record<string, number> = {
  bca: 1.6,
};

/** Logos whose wordmark is black/dark grey vanish on the dark theme without a
 *  white plate. invert + hue-rotate(180) flips light/dark but keeps the brand
 *  hue (blue stays blue, black text turns white). Dark mode only. */
const DARK_TEXT_FIX = "dark:[filter:invert(1)_hue-rotate(180deg)]";
const BANK_DARK_TEXT = new Set(["permata"]);

function BankLogo({ id, className, zoom: zoomOverride }: { id: string; className?: string; zoom?: number }) {
  const src = BANK_LOGO_SRC[id];
  if (!src) return <span className={className}>{id.toUpperCase()}</span>;
  const zoom = zoomOverride ?? BANK_LOGO_ZOOM[id];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center overflow-hidden rounded-[3px] bg-white p-0.5",
        className
      )}
    >
      <img
        src={src}
        alt={id.toUpperCase()}
        className={cn("h-full w-full object-contain", BANK_DARK_TEXT.has(id) && className?.includes("bg-transparent") && DARK_TEXT_FIX)}
        style={zoom ? { transform: `scale(${zoom})` } : undefined}
        draggable={false}
      />
    </span>
  );
}

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000];

/** v35 - every expanded payment panel (VA, Kartu, QRIS) gets the SAME fixed
 *  height, shared with the VA bank list (label + scrolling list). Taller content
 *  (card form, QRIS code) scrolls inside the panel instead of stretching the
 *  dialog, so all three look identical when opened. */
// v40 - fills the screen down to just above the bottom nav, min 260px
// (see .pay-panel-h in globals.css).
const PANEL_H = "pay-panel-h";
const PANEL_SCROLL = "no-scrollbar overflow-y-auto overscroll-contain";
const MIN_TOPUP = 10_000;
const MAX_TOPUP = 10_000_000;
const MIN_WITHDRAW = 10_000;

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
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);

  /** Bumped on every new top-up so <TopUpDialog key> remounts with fresh state. */
  const [dialogSeq, setDialogSeq] = React.useState(0);

  function openTopUp(value: number) {
    setAmount(value);
    setDialogSeq((n) => n + 1);
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
    WITHDRAW: t("tWithdraw"),
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
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#1e3a8a] p-5 dark:bg-[#1e3a8a]"
      >
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
                className="flex items-center justify-center gap-1 rounded-xl border border-white/25 bg-white/10 py-2.5 text-[11px] font-bold text-white transition-all hover:bg-white/20 active:scale-[0.97]"
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

          {/* withdraw - cash the balance out to a bank account */}
          <button
            onClick={() => setWithdrawOpen(true)}
            disabled={balance < MIN_WITHDRAW}
            className="mt-2.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/[0.06] text-xs font-bold text-white transition hover:bg-white/[0.12] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            {t("tWithdraw")}
          </button>
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
        key={dialogSeq}
        open={dialogOpen}
        amount={amount}
        onOpenChange={(v) => setDialogOpen(v)}
        onSettled={(note) => {
          topUp(amount, note);
          toast(`${t("payDone")} · +${rupiah(amount)}`, "success");
        }}
      />

      <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} />
    </div>
  );
}

// ───────────────────────── WithdrawDialog ─────────────────────────

/** E-wallet cash-out targets. Bank transfers are free; e-wallets carry an admin fee.
 *  Logos are the user's artwork from /logo/e-wallet, copied to /public/ewallet-logos.
 *  `zoom` crops away the empty padding some files carry (GoPay, ShopeePay). */
const EWALLETS: { id: string; name: string; fee: number; logo: string; zoom?: number; darkText?: boolean }[] = [
  { id: "gopay", name: "GoPay", fee: 1_000, logo: "/ewallet-logos/gopay.png", zoom: 3.4, darkText: true },
  { id: "ovo", name: "OVO", fee: 1_500, logo: "/ewallet-logos/ovo.webp" },
  { id: "dana", name: "DANA", fee: 1_000, logo: "/ewallet-logos/dana.webp" },
  // background checkerboard removed + cropped from the user's file, so no zoom needed
  { id: "shopeepay", name: "ShopeePay", fee: 1_000, logo: "/ewallet-logos/shopeepay.webp" },
  { id: "linkaja", name: "LinkAja", fee: 1_500, logo: "/ewallet-logos/linkaja.webp" },
];

type WithdrawTarget = { kind: "bank" | "ewallet"; id: string; name: string; fee: number };

function targetFor(key: string): WithdrawTarget {
  const ew = EWALLETS.find((e) => e.id === key);
  if (ew) return { kind: "ewallet", id: ew.id, name: ew.name, fee: ew.fee };
  const b = VA_BANKS.find((x) => x.id === key) ?? VA_BANKS[0];
  return { kind: "bank", id: b.id, name: b.name, fee: 0 };
}

const fmtDots = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Cash out wallet balance to a bank account (free) or an e-wallet (admin fee). Simulated. */
function WithdrawDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const lang = useParkir((s) => s.lang);
  const balance = useParkir((s) => s.walletBalance);
  const withdraw = useParkir((s) => s.withdraw);
  const toast = useParkir((s) => s.toast);
  const id = lang === "id";

  const [amountTxt, setAmountTxt] = React.useState("");
  const [targetKey, setTargetKey] = React.useState<string>(VA_BANKS[0].id);
  const [account, setAccount] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setAmountTxt("");
      setAccount("");
      setErr(null);
    }
  }, [open]);

  const target = targetFor(targetKey);
  const isEwallet = target.kind === "ewallet";
  const amount = Number(amountTxt.replace(/\D/g, "")) || 0;
  const total = amount + target.fee;

  function submit() {
    if (amount < MIN_WITHDRAW) return setErr(id ? `Minimal tarik ${rupiah(MIN_WITHDRAW)}` : `Minimum ${rupiah(MIN_WITHDRAW)}`);
    if (total > balance)
      return setErr(
        target.fee
          ? id ? `Saldo tidak cukup (jumlah + biaya admin ${rupiah(target.fee)})` : `Insufficient balance (amount + ${rupiah(target.fee)} fee)`
          : id ? "Saldo tidak cukup" : "Insufficient balance"
      );
    if (isEwallet ? !/^08\d{8,11}$/.test(account) : !/^\d{8,16}$/.test(account))
      return setErr(
        isEwallet
          ? id ? "Nomor HP harus diawali 08 (10–13 angka)" : "Phone number must start with 08 (10–13 digits)"
          : id ? "Nomor rekening harus 8–16 angka" : "Account number must be 8–16 digits"
      );
    const note = `${target.name} ••${account.slice(-4)}${target.fee ? ` · admin ${rupiah(target.fee)}` : ""}`;
    const ok = withdraw(total, note);
    if (!ok) return setErr(id ? "Saldo tidak cukup" : "Insufficient balance");
    toast(
      id ? `Penarikan ${rupiah(amount)} ke ${target.name} sedang diproses` : `Withdrawal of ${rupiah(amount)} to ${target.name} is processing`,
      "success"
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="no-scrollbar max-h-[90dvh] max-w-[380px] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>{id ? "Tarik saldo" : "Withdraw balance"}</DialogTitle>
          <DialogDescription>
            {id ? `Saldo kamu ${rupiah(balance)}. Dana masuk maks. 1x24 jam.` : `Your balance is ${rupiah(balance)}. Funds arrive within 24 hours.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* destination */}
          <div className="space-y-1.5">
            <p className="flex items-center justify-between text-xs font-semibold">
              Bank
              <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-600 dark:text-green-400">
                {id ? "Gratis biaya admin" : "No admin fee"}
              </span>
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {VA_BANKS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setTargetKey(b.id);
                    setAccount("");
                    setErr(null);
                  }}
                  aria-pressed={targetKey === b.id}
                  aria-label={b.name}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-xl border px-1.5 transition",
                    targetKey === b.id ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border"
                  )}
                >
                  <BankLogo id={b.id} className="h-5 w-full bg-transparent p-0" zoom={b.id === "bca" ? 2.1 : undefined} />
                </button>
              ))}
            </div>

            <p className="flex items-center justify-between pt-1 text-xs font-semibold">
              E-wallet
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                {id ? "Kena biaya admin" : "Admin fee applies"}
              </span>
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {EWALLETS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setTargetKey(e.id);
                    setAccount("");
                    setErr(null);
                  }}
                  aria-pressed={targetKey === e.id}
                  aria-label={`${e.name}, biaya admin ${rupiah(e.fee)}`}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-1.5 py-1.5 transition",
                    targetKey === e.id ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border"
                  )}
                >
                  <span className="flex h-7 w-full items-center justify-center overflow-hidden px-1">
                    <img
                      src={e.logo}
                      alt={e.name}
                      draggable={false}
                      className={cn("h-full w-full object-contain", e.darkText && DARK_TEXT_FIX)}
                      style={e.zoom ? { transform: `scale(${e.zoom})` } : undefined}
                    />
                  </span>
                  <span className="tnum text-[9.5px] text-muted-foreground">+{rupiah(e.fee)}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold">{id ? "Jumlah" : "Amount"}</span>
            <div className="flex gap-2">
              <input
                inputMode="numeric"
                value={amountTxt}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "");
                  setAmountTxt(d ? fmtDots(Number(d)) : "");
                  setErr(null);
                }}
                placeholder={id ? "mis. 50.000" : "e.g. 50,000"}
                className="tnum h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm font-bold focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setAmountTxt(fmtDots(Math.max(0, balance - target.fee)))}
                className="h-11 shrink-0 rounded-xl border border-border px-3 text-xs font-bold text-primary"
              >
                {id ? "Semua" : "All"}
              </button>
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold">
              {isEwallet
                ? id ? `Nomor HP terdaftar di ${target.name}` : `Phone number registered to ${target.name}`
                : id ? "Nomor rekening" : "Account number"}
            </span>
            <input
              inputMode="numeric"
              value={account}
              onChange={(e) => {
                setAccount(e.target.value.replace(/\D/g, "").slice(0, isEwallet ? 13 : 16));
                setErr(null);
              }}
              placeholder={isEwallet ? "081234567890" : "1234567890"}
              className="tnum h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold focus:border-primary focus:outline-none"
            />
          </label>

          {/* fee breakdown */}
          <dl className="space-y-1 rounded-xl bg-muted/60 px-3 py-2.5 text-[12.5px]">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{id ? "Diterima" : "You receive"}</dt>
              <dd className="tnum font-semibold">{rupiah(amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{id ? "Biaya admin" : "Admin fee"}</dt>
              <dd className={cn("tnum font-semibold", !target.fee && "text-green-600 dark:text-green-400")}>
                {target.fee ? rupiah(target.fee) : id ? "Gratis" : "Free"}
              </dd>
            </div>
            <div className="flex justify-between border-t border-dashed border-border pt-1">
              <dt className="text-muted-foreground">{id ? "Dipotong dari saldo" : "Taken from balance"}</dt>
              <dd className="tnum font-bold">{rupiah(total)}</dd>
            </div>
          </dl>

          {err && <p className="text-[12px] font-semibold text-destructive">{err}</p>}

          <button
            onClick={submit}
            className="h-12 w-full rounded-2xl bg-primary text-sm font-bold text-primary-foreground transition active:scale-[0.98]"
          >
            {id ? `Tarik ke ${target.name}` : `Withdraw to ${target.name}`}
          </button>
          <p className="text-center text-[10.5px] text-muted-foreground">
            {id ? "Simulasi - tidak ada uang sungguhan yang dikirim." : "Simulation - no real money is sent."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
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

  // v31 - no reset effect: the parent remounts this component with a fresh
  // `key` every time a top-up is started, so all state above starts clean.

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
          // v29 - "sm:max-w-[400px]" instead of an unconditional
          // "max-w-[400px]" so the base dialog's own
          // "max-w-[calc(100%-2rem)]" side margin still applies on narrow
          // phones (< 432px wide). Overriding it outright made the dialog
          // stretch to the full viewport width with no side gutter on
          // phones narrower than 400px, so it looked glued to the left/right
          // edges. sm:max-w caps it at 400px only once the screen is wide
          // enough that the margin is no longer needed.
          "sm:max-w-[400px] rounded-3xl border-border bg-card/95 p-5 backdrop-blur-xl",
          // v31 - DialogContent is a CSS grid; grid items default to
          // min-width:auto, so any wide child could stretch the single track
          // past the dialog and push content off to the right. Let every
          // direct child shrink to the dialog's width instead.
          "[&>*]:min-w-0",
          // v29 - cap the dialog to the viewport height and let it scroll
          // internally; without this the expanded method accordion (esp.
          // the VA bank list) could grow taller than the screen and get
          // clipped/overflow past the viewport ("nembus") instead of
          // scrolling in place.
          // v32 - height capped to the iOS SAFE area (dialog-safe-h in
          // globals.css), not the raw 100dvh, so the expanded card/QRIS panels
          // scroll inside the dialog instead of running up under the status bar.
          "dialog-safe-h overflow-y-auto overscroll-contain",
          // v39 - anchor the top edge so expanding a method only grows the
          // dialog downward (see .dialog-top in globals.css).
          "dialog-top",
          // v31 - hide the dialog's own scrollbar (scroll still works). A
          // classic desktop scrollbar ate ~15px on the right only, so the
          // method cards sat visibly off-center, and it popped in/out while
          // the accordion animated, making the whole content jitter sideways.
          "no-scrollbar"
        )}
        // v34 - the default close X is `absolute` inside this scrolling
        // container, so it scrolled away (and on iOS sat under the status bar)
        // once the tall QRIS / card panel was open - the dialog could not be
        // closed. We render our own X inside a sticky header instead.
        showCloseButton={false}
      >
        <DialogHeader className="sticky -top-5 z-20 -mx-5 -mt-5 space-y-1 rounded-t-3xl bg-card/95 px-12 pb-3 pt-5 backdrop-blur-xl">
          <DialogClose
            aria-label={lang === "id" ? "Tutup" : "Close"}
            data-pay-close
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/80 text-muted-foreground transition hover:text-foreground active:scale-90"
          >
            <X className="h-4 w-4" />
          </DialogClose>
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
                    className="@container/payrow flex w-full flex-wrap items-start gap-3 p-3.5 text-left transition hover:bg-card/80 active:scale-[0.99]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                      <m.icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold leading-tight">{m.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{m.sub}</span>
                      {/* v30 - real bank logo chips, sized by container query instead of a
                          fixed count. This row measures ITS OWN available width (not the
                          viewport), so it always fits: the fewest logos + a bigger "+N" show
                          by default, and more logos reveal as room allows - no manual
                          breakpoint per phone model, no horizontal overflow on narrow screens. */}
                      {m.k === "va" && (
                        <span className="@container/valogos mt-1.5 flex items-center gap-1 overflow-hidden">
                          <BankLogo id="bca" className="h-4 w-9 shrink-0 rounded-[3px]" />
                          <BankLogo
                            id="mandiri"
                            className="hidden h-4 w-9 shrink-0 rounded-[3px] @[120px]/valogos:flex"
                          />
                          <BankLogo
                            id="bni"
                            className="hidden h-4 w-9 shrink-0 rounded-[3px] @[165px]/valogos:flex"
                          />
                          <BankLogo
                            id="bri"
                            className="hidden h-4 w-9 shrink-0 rounded-[3px] @[210px]/valogos:flex"
                          />
                          <span className="shrink-0 text-[9.5px] font-semibold text-muted-foreground @[120px]/valogos:hidden">
                            +7
                          </span>
                          <span className="hidden shrink-0 text-[9.5px] font-semibold text-muted-foreground @[120px]/valogos:inline @[165px]/valogos:hidden">
                            +6
                          </span>
                          <span className="hidden shrink-0 text-[9.5px] font-semibold text-muted-foreground @[165px]/valogos:inline @[210px]/valogos:hidden">
                            +5
                          </span>
                          <span className="hidden shrink-0 text-[9.5px] font-semibold text-muted-foreground @[210px]/valogos:inline">
                            +4
                          </span>
                        </span>
                      )}
                    </span>
                    {/* v30 - price + chevron: on a narrow container this row has no
                        spare width next to the icon/title, so instead of clipping
                        (the accordion card's overflow-hidden was silently cutting
                        it off) it drops to its own full-width row below the title.
                        Once the row has enough room it goes back to the original
                        right-aligned column. basis-full forces the wrap itself -
                        it doesn't rely on the browser running out of space. */}
                    <span className="ml-[52px] flex basis-full items-center justify-between @[260px]/payrow:ml-0 @[260px]/payrow:flex-col @[260px]/payrow:items-end @[260px]/payrow:gap-1 @[260px]/payrow:basis-auto @[260px]/payrow:self-center">
                      <span className="tnum text-sm font-black text-primary">{rupiah(amount)}</span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
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
                            <div data-va-banks className={cn(PANEL_H, "flex flex-col")}>
                              <p className="mb-2 shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                                {t("payVaPickBank")}
                              </p>
                              <div className="no-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain">
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
                          {m.k === "card" && (
                          <div data-card-scroll className={cn(PANEL_H, PANEL_SCROLL)}>
                          <CardForm
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
                          />
                          </div>
                          )}

                          {/* ── QRIS: scannable code ── */}
                          {m.k === "qris" && (
                            <div data-qris-scroll className={cn(PANEL_H, PANEL_SCROLL)}>
                              <QrisPanel
                                amount={amount}
                                lang={lang}
                                t={t}
                                onPaid={() => settle("QRIS")}
                                onHide={() => setExpandedMethod(null)}
                              />
                            </div>
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
  onHide,
}: {
  amount: number;
  lang: "id" | "en";
  t: (k: Parameters<typeof tr>[1]) => string;
  onPaid: () => void;
  /** v34 - collapse the QRIS panel (hide the QR) without closing the dialog. */
  onHide: () => void;
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

      <button
        onClick={onHide}
        data-qris-hide
        className="mx-auto flex items-center gap-1 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
        {lang === "id" ? "Sembunyikan QR" : "Hide QR"}
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
                  credit ? "text-green-400" : "text-red-400"
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
