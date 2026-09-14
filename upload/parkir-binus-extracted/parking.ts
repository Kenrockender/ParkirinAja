/**
 * Business logic — BINUS Self-Parking (per PRD v1.0)
 * All datetimes use WIB (UTC+7) semantics; date/startTime/endTime stored as strings
 * so overlap & duration math is timezone-independent.
 */

export const WIB = "+07:00";

export interface TariffConfig {
  advanceFee: number;
  walkInFee: number;
  overtimeFeePerHour: number;
  parkFirstHours: number;
  parkFirstHoursFee: number;
  parkAddHourFee: number;
  parkMaxFee: number;
  refundFullBeforeH: number;
  refundPartialPct: number;
  noShowRefundPct: number;
  openHour: number;
  closeHour: number;
}

export interface TimeWindow {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

/** WIB wall-clock reader: returns pseudo-Date whose UTC fields equal Jakarta time.
 *  Use ONLY for reading hours/date strings — NEVER for arithmetic with wibDate() instants. */
export function nowWib(): Date {
  const now = new Date();
  return new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
}

/** Full WIB Date (REAL instant) from date + time strings — safe for arithmetic vs new Date() */
export function wibDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${WIB}`);
}

/** Real current instant — for comparisons/arithmetic with wibDate() instants. */
export function nowInstant(): Date {
  return new Date();
}

export function wibDateStr(d = nowWib()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function wibTimeStr(d = nowWib()): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Do two windows overlap? (boundary-touching = NOT overlap, per PRD §34) */
export function overlaps(a: TimeWindow, b: TimeWindow): boolean {
  if (a.date !== b.date) return false;
  const aS = toMinutes(a.startTime);
  const aE = toMinutes(a.endTime);
  const bS = toMinutes(b.startTime);
  const bE = toMinutes(b.endTime);
  return aS < bE && bS < aE;
}

/** Validate window: end > start, within operating hours, duration cap.
 *  `now` must be a REAL instant (new Date()), compared against wibDate() instants. */
export function validateWindow(w: TimeWindow, cfg: TariffConfig, now: Date = new Date()): { ok: boolean; error?: string } {
  const s = toMinutes(w.startTime);
  const e = toMinutes(w.endTime);
  if (!w.date || !w.startTime || !w.endTime) return { ok: false, error: "incomplete" };
  if (e <= s) return { ok: false, error: "end_before_start" };
  if (s < cfg.openHour * 60) return { ok: false, error: "before_open" };
  if (e > cfg.closeHour * 60) return { ok: false, error: "after_close" };
  const hours = (e - s) / 60;
  if (hours > 12) return { ok: false, error: "too_long" };
  // window must not be in the past (with 5-min tolerance)
  const winStart = wibDate(w.date, w.startTime);
  if (winStart.getTime() < now.getTime() - 5 * 60000) return { ok: false, error: "in_past" };
  return { ok: true };
}

/** BINUS parking fee by minutes parked (student car tariff, configurable) */
export function parkingFee(minutes: number, cfg: TariffConfig): number {
  const hours = Math.max(1, Math.ceil(minutes / 60));
  if (hours <= cfg.parkFirstHours) return cfg.parkFirstHoursFee;
  const fee = cfg.parkFirstHoursFee + (hours - cfg.parkFirstHours) * cfg.parkAddHourFee;
  return Math.min(fee, cfg.parkMaxFee);
}

/** Overtime: Rp N for each STARTED overtime hour (ceil) */
export function overtimeFee(minutesLate: number, cfg: TariffConfig): number {
  if (minutesLate <= 0) return 0;
  const hours = Math.ceil(minutesLate / 60);
  return hours * cfg.overtimeFeePerHour;
}

/** Refund policy: 
 * - Within 10 minutes of booking creation => 100% refund
 * - More than 24h before start => 50% refund
 * - Within 24h of start => 50% refund
 * - No-show => 0% refund 
 */
export function refundAmount(serviceFee: number, start: Date, cancelledAt: Date, createdAt: Date, cfg: TariffConfig): number {
  // Check if within 10 minutes of creation
  const minutesSinceCreation = (cancelledAt.getTime() - createdAt.getTime()) / 60000;
  if (minutesSinceCreation <= 10) return serviceFee; // 100% refund
  
  // Otherwise check hours before start (50% refund if >24h before start)
  const hoursBefore = (start.getTime() - cancelledAt.getTime()) / 3600000;
  if (hoursBefore > cfg.refundFullBeforeH) return Math.floor((serviceFee * cfg.refundPartialPct) / 100);
  
  return Math.floor((serviceFee * cfg.refundPartialPct) / 100);
}

/** Slot display status for a query window */
export function slotStatusForWindow(
  slot: { id: string; status: string },
  reservations: { slotId: string; status: string; date: string; startTime: string; endTime: string }[],
  window: TimeWindow
): "AVAILABLE" | "RESERVED" | "OCCUPIED" | "MAINTENANCE" {
  if (slot.status === "MAINTENANCE") return "MAINTENANCE";
  for (const r of reservations) {
    if (r.slotId !== slot.id) continue;
    if (!["CONFIRMED", "CHECKED_IN", "PENDING_PAYMENT"].includes(r.status)) continue;
    if (overlaps({ date: r.date, startTime: r.startTime, endTime: r.endTime }, window)) {
      return r.status === "CHECKED_IN" ? "OCCUPIED" : "RESERVED";
    }
  }
  return "AVAILABLE";
}

export const ACTIVE_STATUSES = ["CONFIRMED", "CHECKED_IN", "PENDING_PAYMENT"];

export function rupiah(n: number): string {
  return `Rp${n.toLocaleString("id-ID")}`;
}
