/**
 * ledger.ts — double-entry accounting engine (v23).
 *
 * Every wallet transaction maps to a balanced journal entry over a 5-account
 * chart of accounts. The ledger is the source of truth for the Finance tab:
 * journal, trial balance (Dr = Cr), P&L, cash position, and break-even.
 */
import { rupiah, type Txn, type TxnType } from "./parking-data";

// ───────────────────── chart of accounts ─────────────────────

export interface CoAAccount {
  code: string;
  name: string;
  /** Normal balance side. */
  normal: "DR" | "CR";
}

export const COA: CoAAccount[] = [
  { code: "1-1100", name: "Kas & Bank", normal: "DR" },
  { code: "2-2100", name: "Utang Saldo Pengguna", normal: "CR" },
  { code: "4-4100", name: "Pendapatan Layanan Parkir", normal: "CR" },
  { code: "4-4200", name: "Pendapatan Denda Keterlambatan", normal: "CR" },
  { code: "5-5100", name: "Beban Refund", normal: "DR" },
];

export function accountByCode(code: string): CoAAccount {
  return COA.find((a) => a.code === code) ?? COA[0];
}

const KAS = "1-1100";
const UTANG = "2-2100";
const LAYANAN = "4-4100";
const DENDA = "4-4200";
const BEBAN_REFUND = "5-5100";

// ───────────────────── journal ─────────────────────

export interface JournalLine {
  account: string;
  dr: number;
  cr: number;
}

export interface JournalEntry {
  id: string;
  txnId: string;
  at: number;
  memo: string;
  lines: JournalLine[];
}

/**
 * Post one wallet transaction as a balanced journal entry:
 *   TOP_UP      → Dr Kas & Bank            / Cr Utang Saldo Pengguna
 *   SERVICE_FEE → Dr Utang Saldo Pengguna  / Cr Pendapatan Layanan
 *   OVERTIME    → Dr Utang Saldo Pengguna  / Cr Pendapatan Denda
 *   REFUND      → Dr Beban Refund          / Cr Utang Saldo Pengguna
 * Zero-amount transactions post nothing (return null).
 */
export function postTransaction(txn: Pick<Txn, "id" | "type" | "amount" | "createdAt" | "note">): JournalEntry | null {
  if (txn.amount <= 0) return null;
  const base = { id: `je-${txn.id}`, txnId: txn.id, at: txn.createdAt, memo: memoFor(txn.type, txn.note) };
  switch (txn.type) {
    case "TOP_UP":
      return { ...base, lines: [{ account: KAS, dr: txn.amount, cr: 0 }, { account: UTANG, dr: 0, cr: txn.amount }] };
    case "SERVICE_FEE":
      return { ...base, lines: [{ account: UTANG, dr: txn.amount, cr: 0 }, { account: LAYANAN, dr: 0, cr: txn.amount }] };
    case "OVERTIME":
      return { ...base, lines: [{ account: UTANG, dr: txn.amount, cr: 0 }, { account: DENDA, dr: 0, cr: txn.amount }] };
    case "REFUND":
      return { ...base, lines: [{ account: BEBAN_REFUND, dr: txn.amount, cr: 0 }, { account: UTANG, dr: 0, cr: txn.amount }] };
    default:
      return null;
  }
}

function memoFor(type: TxnType, note: string): string {
  const label =
    type === "TOP_UP" ? "Top up dompet" : type === "SERVICE_FEE" ? "Biaya layanan parkir" : type === "OVERTIME" ? "Denda keterlambatan" : "Refund pembatalan";
  return note ? `${label} · ${note}` : label;
}

/** Build the full journal from wallet transactions (newest first). */
export function buildJournal(txns: Txn[]): JournalEntry[] {
  return txns
    .map((t) => postTransaction(t))
    .filter((e): e is JournalEntry => e !== null)
    .sort((a, b) => b.at - a.at);
}

// ───────────────────── trial balance ─────────────────────

export interface TrialRow {
  account: string;
  name: string;
  dr: number;
  cr: number;
}

export interface TrialBalance {
  rows: TrialRow[];
  totalDr: number;
  totalCr: number;
  balanced: boolean;
}

export function trialBalance(entries: JournalEntry[]): TrialBalance {
  const sums = new Map<string, { dr: number; cr: number }>();
  for (const e of entries) {
    for (const l of e.lines) {
      const cur = sums.get(l.account) ?? { dr: 0, cr: 0 };
      cur.dr += l.dr;
      cur.cr += l.cr;
      sums.set(l.account, cur);
    }
  }
  // Netted balances (classic neraca saldo): net = dr − cr; a positive net sits
  // in the DR column, a negative net sits in the CR column. Dr total === Cr total.
  const rows = COA.map((a) => {
    const s = sums.get(a.code) ?? { dr: 0, cr: 0 };
    const net = s.dr - s.cr;
    return { account: a.code, name: a.name, dr: Math.max(0, net), cr: Math.max(0, -net) };
  });
  const totalDr = rows.reduce((x, r) => x + r.dr, 0);
  const totalCr = rows.reduce((x, r) => x + r.cr, 0);
  return { rows, totalDr, totalCr, balanced: totalDr === totalCr };
}

// ───────────────────── P&L & cash position ─────────────────────

export interface ProfitLoss {
  service: number;
  fines: number;
  refunds: number;
  netIncome: number;
}

export function profitAndLoss(entries: JournalEntry[]): ProfitLoss {
  let service = 0;
  let fines = 0;
  let refunds = 0;
  for (const e of entries) {
    for (const l of e.lines) {
      if (l.account === LAYANAN) service += l.cr - l.dr;
      if (l.account === DENDA) fines += l.cr - l.dr;
      if (l.account === BEBAN_REFUND) refunds += l.dr - l.cr;
    }
  }
  return { service, fines, refunds, netIncome: service + fines - refunds };
}

export interface CashPosition {
  /** Dr balance of Kas & Bank (total top-ups). */
  cash: number;
  /** Cr balance of Utang Saldo Pengguna. */
  liability: number;
  netIncome: number;
}

/** Invariant: cash − liability === netIncome (the accounting equation). */
export function cashPosition(entries: JournalEntry[]): CashPosition {
  const tb = trialBalance(entries);
  const cash = tb.rows.find((r) => r.account === KAS)?.dr ?? 0;
  const liability = tb.rows.find((r) => r.account === UTANG)?.cr ?? 0;
  const pl = profitAndLoss(entries);
  return { cash, liability, netIncome: pl.netIncome };
}

// ───────────────────── break-even ─────────────────────

export const BEP_DEFAULTS = {
  fixed: 15_000_000, // beban tetap / bulan (gedung, gaji, sistem)
  variable: 2_500, // biaya variabel / sesi
} as const;

export interface BreakEven {
  /** Contribution margin per session (arpu − variable). */
  cm: number;
  /** Sessions needed per month to cover fixed costs (Infinity when CM ≤ 0). */
  bepSessions: number;
  /** (runRate − bep) / bep in percent — negative means below break-even. */
  safetyPct: number;
}

export function breakEven(args: { fixed: number; variable: number; arpu: number; runRateSessions: number }): BreakEven {
  const cm = args.arpu - args.variable;
  const bepSessions = cm > 0 ? Math.ceil(args.fixed / cm) : Infinity;
  const safetyPct =
    Number.isFinite(bepSessions) && bepSessions > 0
      ? ((args.runRateSessions - bepSessions) / bepSessions) * 100
      : Number.Negative_INFINITY;
  return { cm, bepSessions, safetyPct };
}

// ───────────────────── formatting ─────────────────────

/** Rupiah short form: 1_500_000 → "1,5 jt" · 75_000 → "75 rb". */
export function rupiahShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${trim(n / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `${trim(n / 1_000_000)} jt`;
  if (abs >= 1_000) return `${trim(n / 1_000)} rb`;
  return rupiah(n);
}

function trim(v: number): string {
  return v.toFixed(v < 10 ? 1 : 0).replace(".", ",").replace(",0", "");
}
