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

// ─── PDF Receipt (Task 4) ───────────────────────────────────────────────────

import type { Campus } from "./parking-data";

/** Format number as Rupiah for PDF (no library needed — plain string). */
function rupiahPdf(n: number): string {
  return `Rp${n.toLocaleString("id-ID")}`;
}

/**
 * Generate and download a parking receipt PDF using jspdf.
 * Called client-side only — jspdf is a browser library.
 */
export async function generateReceipt(
  reservation: Reservation,
  campus: Campus,
  lang: "id" | "en"
): Promise<void> {
  // Dynamic import so jspdf is never included in SSR bundle
  const { jsPDF } = await import("jspdf");
  const id = lang === "id";

  const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });

  const W = doc.internal.pageSize.getWidth();
  let y = 14;

  const line = (x1: number, y1: number, x2: number, y2: number) =>
    doc.line(x1, y1, x2, y2);
  const text = (
    t: string,
    x: number,
    yPos: number,
    opts?: { align?: "left" | "center" | "right"; bold?: boolean; size?: number }
  ) => {
    doc.setFontSize(opts?.size ?? 10);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.text(t, x, yPos, { align: opts?.align ?? "left" });
  };

  // ── Header ──
  doc.setFillColor(11, 18, 38); // #0b1226
  doc.rect(0, 0, W, 22, "F");

  doc.setTextColor(255, 214, 10); // primary gold
  text("PARKIR BINUS", W / 2, 10, { align: "center", bold: true, size: 14 });
  doc.setTextColor(200, 200, 200);
  text(campus.name, W / 2, 16, { align: "center", size: 8 });

  y = 28;
  doc.setTextColor(30, 30, 30);

  // ── Title ──
  text(id ? "KWITANSI PARKIR" : "PARKING RECEIPT", W / 2, y, {
    align: "center", bold: true, size: 12,
  });
  y += 6;

  doc.setDrawColor(220, 210, 180);
  line(10, y, W - 10, y);
  y += 6;

  // ── Meta rows ──
  const rowL = (label: string, value: string) => {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110, 100, 85);
    doc.text(label, 12, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(value, W - 12, y, { align: "right" });
    y += 6;
  };

  rowL(id ? "No. Kwitansi" : "Receipt No.", reservation.code);
  rowL(id ? "Tanggal" : "Date", reservation.date);
  rowL(id ? "Pengemudi" : "Driver", reservation.driverName);
  rowL(id ? "Kendaraan" : "Vehicle", reservation.vehicleName || "-");
  rowL(id ? "Plat" : "Plate", reservation.vehiclePlate);
  rowL(id ? "Slot" : "Slot", reservation.slotNumber);
  rowL(id ? "Lokasi" : "Location", campus.location);
  rowL(id ? "Jadwal" : "Window", `${reservation.startTime} – ${reservation.endTime}`);

  y += 2;
  line(10, y, W - 10, y);
  y += 7;

  // ── Fee rows ──
  const feeRow = (label: string, amount: number, bold = false) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(bold ? 30 : 80, bold ? 30 : 75, bold ? 30 : 60);
    doc.text(label, 12, y);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(rupiahPdf(amount), W - 12, y, { align: "right" });
    y += 6.5;
  };

  feeRow(id ? "Biaya layanan parkir" : "Parking service fee", reservation.serviceFee);
  if (reservation.overtimeFee > 0) {
    feeRow(id ? "Denda keterlambatan" : "Late fine", reservation.overtimeFee);
  }
  if (reservation.refundAmount > 0) {
    feeRow(id ? "Refund pembatalan" : "Cancellation refund", -reservation.refundAmount);
  }

  y += 1;
  line(10, y, W - 10, y);
  y += 7;

  const total = reservation.serviceFee + reservation.overtimeFee - reservation.refundAmount;
  feeRow(id ? "TOTAL" : "TOTAL", total, true);

  y += 6;
  doc.setDrawColor(220, 210, 180);
  line(10, y, W - 10, y);
  y += 8;

  // ── Footer ──
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(140, 130, 110);
  const footer = id
    ? "Terima kasih telah menggunakan Parkir Binus. Simpan kwitansi ini sebagai bukti pembayaran."
    : "Thank you for using Parkir Binus. Keep this receipt as proof of payment.";
  const lines = doc.splitTextToSize(footer, W - 24) as string[];
  doc.text(lines, W / 2, y, { align: "center" });
  y += lines.length * 4 + 4;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(170, 160, 140);
  const ts = new Date().toLocaleString(id ? "id-ID" : "en-US");
  doc.text(`${id ? "Dibuat" : "Generated"}: ${ts}`, W / 2, y, {
    align: "center",
  });

  // ── Download ──
  doc.save(`kwitansi-${reservation.code}-${reservation.date}.pdf`);
}
