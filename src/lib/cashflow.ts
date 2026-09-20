/**
 * cashflow.ts — 14-day revenue projection (v24), read-only from the
 * analytics dataset (v18 stream untouched).
 *
 * Method: weekday-profile mean blended with an EWMA level (α = 0.3);
 * the 90% band is ±1.645σ of the residuals vs the weekday profile.
 */
import { ANA_DAYS } from "./analytics";

export const CF_WINDOW = 14;
const ALPHA = 0.3;
const Z90 = 1.645;

export interface CfDay {
  date: string;
  /** Actual revenue (history context days only; undefined for future days). */
  actual?: number;
  forecast: number;
  lo: number;
  hi: number;
}

export interface Cashflow {
  /** Last 10 actual days (context) + 14 forecast days. */
  days: CfDay[];
  /** Sum of the 14 forecast days. */
  total: number;
  /** Forecast total / 14. */
  avg: number;
  /** (forecast avg − last-14 actual avg) / last-14 actual avg, in percent. */
  deltaPct: number;
}

function addDays(ds: string, n: number): string {
  const d = new Date(`${ds}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dow(ds: string): number {
  return new Date(`${ds}T00:00:00`).getDay();
}

/**
 * Build the projection from per-day revenue rows (ascending, zero-filled).
 * Missing days are treated as 0 so the calendar never has gaps.
 */
export function projectCashflow(revenueByDay: { date: string; total: number }[], horizon = CF_WINDOW): Cashflow {
  // zero-filled calendar over the dataset window
  const byDate = new Map(revenueByDay.map((r) => [r.date, r.total]));
  const first = revenueByDay[0]?.date ?? new Date().toISOString().slice(0, 10);
  const cal: { date: string; total: number }[] = [];
  for (let i = 0; i < Math.max(revenueByDay.length, ANA_DAYS); i++) {
    const d = addDays(first, i);
    cal.push({ date: d, total: byDate.get(d) ?? 0 });
  }

  // weekday profile: mean revenue per weekday (0=Sun)
  const sums = new Array(7).fill(0);
  const counts = new Array(7).fill(0);
  for (const row of cal) {
    const d = dow(row.date);
    sums[d] += row.total;
    counts[d]++;
  }
  const profile = sums.map((s, d) => (counts[d] ? s / counts[d] : 0));

  // EWMA level over the whole calendar
  let level = cal.length ? cal[0].total : 0;
  for (const row of cal) level = ALPHA * row.total + (1 - ALPHA) * level;

  // residuals vs weekday profile → σ for the 90% band
  const resid = cal.map((r) => r.total - profile[dow(r.date)]);
  const mean = resid.reduce((a, b) => a + b, 0) / Math.max(1, resid.length);
  const sigma = Math.sqrt(resid.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, resid.length));
  const overallMean = cal.reduce((a, b) => a + b.total, 0) / Math.max(1, cal.length);

  const lastDate = cal[cal.length - 1]?.date ?? new Date().toISOString().slice(0, 10);
  const days: CfDay[] = [];

  // 10 days of actual context
  for (const row of cal.slice(-10)) {
    days.push({ date: row.date, actual: row.total, forecast: 0, lo: 0, hi: 0 });
  }

  // 14 forecast days: blend weekday profile with the EWMA level
  const forecasts: number[] = [];
  for (let i = 1; i <= horizon; i++) {
    const date = addDays(lastDate, i);
    const blend = 0.55 * profile[dow(date)] + 0.45 * (level + (profile[dow(date)] - overallMean));
    const f = Math.max(0, Math.round(blend));
    forecasts.push(f);
    days.push({ date, forecast: f, lo: Math.max(0, Math.round(f - Z90 * sigma)), hi: Math.round(f + Z90 * sigma) });
  }

  const total = forecasts.reduce((a, b) => a + b, 0);
  const last14Actual = cal.slice(-horizon);
  const actualAvg = last14Actual.reduce((a, b) => a + b.total, 0) / Math.max(1, last14Actual.length);
  const deltaPct = actualAvg > 0 ? ((total / horizon - actualAvg) / actualAvg) * 100 : 0;

  return { days, total, avg: Math.round(total / horizon), deltaPct };
}
