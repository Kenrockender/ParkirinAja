/**
 * invoice.ts — PPN 11% invoicing as a REPORTING layer (v24).
 *
 * The double-entry ledger stays GROSS; invoices split each revenue transaction
 * into DPP ( Dasar Pengenaan Pajak ) and PPN with the invariant
 * DPP + PPN === gross. Serial numbers are sequential per calendar month.
 */
import type { Reservation, Txn } from "./parking-data";

export const PPN_RATE = 0.11;

/** Gross-up split: DPP = gross / 1.11 (rounded), PPN = gross − DPP. */
export function splitPpn(gross: number): { dpp: number; ppn: number } {
  const dpp = Math.round(gross / (1 + PPN_RATE));
  return { dpp, ppn: gross - dpp };
}

/** "2026-09-20" | epoch → "2026-09" */
export function monthKey(input: string | number): string {
  const d = typeof input === "number" ? new Date(input) : new Date(`${input}T00:00:00`);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export interface Invoice {
  /** Serial: INV-YYYYMM-NNNN (sequential per calendar month). */
  id: string;
  txnId: string;
  at: number;
  code: string;
  buyer: string;
  plate: string;
  slot: string;
  item: string;
  gross: number;
  dpp: number;
  ppn: number;
}

/**
 * Build invoices from REVENUE transactions only (SERVICE_FEE + OVERTIME).
 * TOP_UP and REFUND are wallet movements, not revenue → excluded.
 * Numbering restarts at 0001 each calendar month; the list is newest first.
 */
export function buildInvoices(txns: Txn[], reservations: Reservation[]): Invoice[] {
  const byCode = new Map(reservations.map((r) => [r.code, r]));
  const revenue = txns
    .filter((t) => t.type === "SERVICE_FEE" || t.type === "OVERTIME")
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt); // oldest first for numbering

  const counters = new Map<string, number>();
  const out: Invoice[] = [];
  for (const t of revenue) {
    const mk = monthKey(t.createdAt);
    const next = (counters.get(mk) ?? 0) + 1;
    counters.set(mk, next);
    const r = byCode.get(t.note);
    const { dpp, ppn } = splitPpn(t.amount);
    out.push({
      id: `INV-${mk.replace("-", "")}-${String(next).padStart(4, "0")}`,
      txnId: t.id,
      at: t.createdAt,
      code: t.note,
      buyer: r?.driverName ?? "Pelanggan Umum",
      plate: r?.vehiclePlate ?? "-",
      slot: r?.slotNumber ?? "-",
      item: t.type === "SERVICE_FEE" ? "Biaya layanan parkir" : "Denda keterlambatan",
      gross: t.amount,
      dpp,
      ppn,
    });
  }
  return out.reverse(); // newest first
}

export interface PpnMonth {
  month: string;
  count: number;
  dpp: number;
  ppn: number;
  gross: number;
}

export interface PpnRecap {
  months: PpnMonth[]; // ascending
  totals: { count: number; dpp: number; ppn: number; gross: number };
}

/** Per-month recap of invoices + grand totals. */
export function ppnRecap(invoices: Invoice[]): PpnRecap {
  const map = new Map<string, PpnMonth>();
  for (const inv of invoices) {
    const mk = monthKey(inv.at);
    const row = map.get(mk) ?? { month: mk, count: 0, dpp: 0, ppn: 0, gross: 0 };
    row.count++;
    row.dpp += inv.dpp;
    row.ppn += inv.ppn;
    row.gross += inv.gross;
    map.set(mk, row);
  }
  const months = [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
  return {
    months,
    totals: {
      count: months.reduce((a, m) => a + m.count, 0),
      dpp: months.reduce((a, m) => a + m.dpp, 0),
      ppn: months.reduce((a, m) => a + m.ppn, 0),
      gross: months.reduce((a, m) => a + m.gross, 0),
    },
  };
}
