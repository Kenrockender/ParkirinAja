/**
 * analytics.ts — deterministic 30-day synthetic dataset (v18) + derived analytics.
 *
 * The PRNG stream below is FROZEN: every derived feature (occupancy, forecast,
 * anomalies, revenue, what-if, cash-flow) reads this dataset without consuming
 * the stream, so the dataset and its invariants stay byte-identical forever.
 * Weekday rhythm follows the REAL calendar (quiet day lands on Saturday).
 */
import { dateStr, DEMAND_TIERS, overtimeFee, type DemandTier } from "./parking-data";

export const ANA_DAYS = 30;
export const ANA_HOUR_START = 7; // 07:00
export const ANA_HOURS = 15; // 07:00–21:00
export const ANA_HORIZON = 48; // forecast horizon (hours)

/** One synthetic parking session (fees follow the v22 no-parking-fee model). */
export interface AnaSession {
  id: string;
  date: string; // YYYY-MM-DD
  startMin: number; // minutes from midnight
  durMin: number;
  isAdvance: boolean;
  tier: DemandTier;
  serviceFee: number;
  overtimeFee: number;
  total: number;
  plannedWindowMin: number;
}

/** v22 — planned window derived WITHOUT touching the PRNG stream. */
export function plannedWindowMin(isAdvance: boolean, durMin: number): number {
  if (!isAdvance) return 120;
  return [60, 120, 180][durMin % 3];
}

// ───────────────────── frozen PRNG stream ─────────────────────

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RND_SEED = 20260918;

/** Weekday session-count ranges — Saturday is the quiet day (getDay()===6). */
function sessionsForWeekday(dow: number): { min: number; max: number } {
  if (dow === 6) return { min: 16, max: 24 }; // Saturday — quiet
  if (dow === 0) return { min: 28, max: 38 }; // Sunday — moderate
  return { min: 48, max: 62 }; // Mon–Fri — busy campus rhythm
}

/**
 * Build the deterministic 30-day world ending `nowMs` (inclusive of today's date).
 * Two "event days" (concert / open-house) inject midday spikes → anomaly detector
 * has genuine signal. All randomness comes from the frozen stream above.
 */
export function buildAnalyticsWorld(nowMs: number = Date.now()): AnaSession[] {
  const rnd = mulberry32(RND_SEED);
  const out: AnaSession[] = [];
  let n = 0;

  for (let d = ANA_DAYS - 1; d >= 0; d--) {
    const day = new Date(nowMs - d * 24 * 3600_000);
    const ds = dateStr(day);
    const dow = day.getDay();
    const range = sessionsForWeekday(dow);
    const count = range.min + Math.floor(rnd() * (range.max - range.min + 1));
    // event-day spike: 2 fixed days get +30 late-midday sessions (deterministic
    // by position in the window, not by calendar, so the pattern is stable)
    const eventDay = d === 9 || d === 21;

    for (let i = 0; i < count; i++) {
      const startMin = ANA_HOUR_START * 60 + Math.floor(rnd() * 11 * 60); // 07:00–18:00
      const durMin = 45 + Math.floor(rnd() * 240); // 45–285 min
      const isAdvance = rnd() < 0.45;
      const rTier = rnd();
      const tier: DemandTier = rTier < 0.15 ? "HIGH" : rTier < 0.5 ? "LOW" : "NORMAL";
      out.push(mkSession(++n, ds, startMin, durMin, isAdvance, tier));
    }

    if (eventDay) {
      for (let i = 0; i < 30; i++) {
        const startMin = 11 * 60 + Math.floor(rnd() * 180); // 11:00–14:00 spike
        const durMin = 60 + Math.floor(rnd() * 150);
        const isAdvance = rnd() < 0.35;
        const rTier = rnd();
        const tier: DemandTier = rTier < 0.4 ? "HIGH" : rTier < 0.7 ? "NORMAL" : "LOW";
        out.push(mkSession(++n, ds, startMin, durMin, isAdvance, tier));
      }
    }
  }

  return out;

  function mkSession(
    id: number,
    ds: string,
    startMin: number,
    durMin: number,
    isAdvance: boolean,
    tier: DemandTier
  ): AnaSession {
    const serviceFee = isAdvance
      ? DEMAND_TIERS[tier].advanceFee
      : DEMAND_TIERS[tier].walkInFee; // walk-in ladder already includes +10K
    const planned = plannedWindowMin(isAdvance, durMin);
    const lateMin = Math.max(0, durMin - planned);
    const fine = overtimeFee(lateMin);
    return {
      id: `ana-${String(id).padStart(4, "0")}`,
      date: ds,
      startMin,
      durMin,
      isAdvance,
      tier,
      serviceFee,
      overtimeFee: fine,
      total: serviceFee + fine,
      plannedWindowMin: planned,
    };
  }
}

// ───────────────────── occupancy series ─────────────────────

/** Slots used as the capacity denominator (Anggrek active bays). */
export const ANA_CAPACITY = 32;

/** Occupancy pct per (day × hour) — share of the hour covered by parked cars. */
export function occupancyMatrix(world: AnaSession[]): number[][] {
  const days = [...new Set(world.map((s) => s.date))].sort();
  const byDay = new Map<string, AnaSession[]>();
  for (const s of world) {
    const list = byDay.get(s.date) ?? [];
    list.push(s);
    byDay.set(s.date, list);
  }
  return days.map((d) => {
    const row = new Array(ANA_HOURS).fill(0);
    const sessions = byDay.get(d) ?? [];
    for (let h = 0; h < ANA_HOURS; h++) {
      const hourStart = (ANA_HOUR_START + h) * 60;
      const hourEnd = hourStart + 60;
      let covered = 0;
      for (const s of sessions) {
        const sStart = s.startMin;
        const sEnd = s.startMin + s.durMin;
        const overlap = Math.max(0, Math.min(sEnd, hourEnd) - Math.max(sStart, hourStart));
        covered += overlap;
      }
      row[h] = Math.min(100, Math.round((covered / (60 * ANA_CAPACITY)) * 100));
    }
    return row;
  });
}

/** Days of the dataset, sorted ascending. */
export function anaDays(world: AnaSession[]): string[] {
  return [...new Set(world.map((s) => s.date))].sort();
}

/** 7 × 15 heatmap — average occupancy pct by weekday (Mon-first) × hour. */
export function heatmapMatrix(world: AnaSession[]): number[][] {
  const days = anaDays(world);
  const matrix = occupancyMatrix(world);
  const sums: number[][] = Array.from({ length: 7 }, () => new Array(ANA_HOURS).fill(0));
  const counts: number[][] = Array.from({ length: 7 }, () => new Array(ANA_HOURS).fill(0));
  days.forEach((d, di) => {
    const dow = new Date(`${d}T00:00:00`).getDay(); // 0=Sun
    const rowIdx = (dow + 6) % 7; // Mon-first
    for (let h = 0; h < ANA_HOURS; h++) {
      sums[rowIdx][h] += matrix[di][h];
      counts[rowIdx][h]++;
    }
  });
  return sums.map((row, r) => row.map((v, h) => Math.round(v / Math.max(1, counts[r][h]))));
}

/** Hourly occupancy series (24h clock) for the last N days — forecast input. */
export function hourlyOccupancySeries(world: AnaSession[], lastDays = 14): number[] {
  const days = anaDays(world).slice(-lastDays);
  const matrix = occupancyMatrix(world);
  const dayIdx = new Map(anaDays(world).map((d, i) => [d, i]));
  const out: number[] = [];
  for (const d of days) {
    const row = matrix[dayIdx.get(d) ?? 0];
    for (let h = 0; h < 24; h++) {
      const idx = h - ANA_HOUR_START;
      out.push(idx >= 0 && idx < ANA_HOURS ? row[idx] : 0);
    }
  }
  return out;
}

// ───────────────────── Holt-Winters forecast ─────────────────────

export interface HwForecast {
  /** forecast points, one per hour for `horizon` hours after the series */
  forecast: number[];
  /** in-sample one-step-ahead MAPE (%) */
  mape: number;
  /** 90% band around the forecast (residual σ × 1.645) */
  band: { lo: number[]; hi: number[] };
}

/**
 * Holt-Winters additive (level + trend + seasonality) over an hourly series.
 * Seasonal period is WEEKLY (168 h) when at least two weeks of data exist —
 * campus occupancy repeats weekly (quiet Saturdays) — else daily (24 h).
 * Alpha=0.32 · beta=0.03 · gamma=0.22.
 */
export function holtWintersForecast(series: number[], horizon: number = ANA_HORIZON): HwForecast {
  const m = series.length >= 336 ? 168 : 24;
  if (series.length < 2 * m) {
    const flat = series.length ? series[series.length - 1] : 0;
    return { forecast: new Array(horizon).fill(flat), mape: 0, band: { lo: new Array(horizon).fill(flat), hi: new Array(horizon).fill(flat) } };
  }
  const alpha = 0.32;
  const beta = 0.03;
  const gamma = 0.22;

  // init: level & trend from the first cycle; seasonal = first cycle deviations
  const firstAvg = series.slice(0, m).reduce((a, b) => a + b, 0) / m;
  const secondAvg = series.slice(m, 2 * m).reduce((a, b) => a + b, 0) / m;
  let level = firstAvg;
  let trend = (secondAvg - firstAvg) / m;
  const seasonal: number[] = series.slice(0, m).map((v) => v - firstAvg);

  const fitted: number[] = [];
  let mapeSum = 0;
  let mapeN = 0;

  for (let t = 0; t < series.length; t++) {
    const s = seasonal[t % m];
    const predicted = level + trend + s;
    fitted.push(predicted);
    const actual = series[t];
    if (actual > 0.5) {
      mapeSum += Math.abs((actual - predicted) / actual);
      mapeN++;
    }
    const prevLevel = level;
    level = alpha * (actual - s) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonal[t % m] = gamma * (actual - level) + (1 - gamma) * s;
  }

  const forecast: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    forecast.push(Math.max(0, level + h * trend + seasonal[(series.length + h - 1) % m]));
  }

  // residual σ from the in-sample fit (last cycle only — representative)
  const tail = Math.min(series.length, m * 2);
  const resid = series.slice(-tail).map((v, i) => v - fitted[series.length - tail + i]);
  const mean = resid.reduce((a, b) => a + b, 0) / resid.length;
  const sigma = Math.sqrt(resid.reduce((a, b) => a + (b - mean) ** 2, 0) / resid.length);
  const z = 1.645;
  const band = {
    lo: forecast.map((v) => Math.max(0, v - z * sigma)),
    hi: forecast.map((v) => v + z * sigma),
  };

  return { forecast, mape: mapeN ? (mapeSum / mapeN) * 100 : 0, band };
}

// ───────────────────── anomaly detection ─────────────────────

export interface AnomalyItem {
  date: string;
  hour: number; // 24h clock
  value: number; // actual occupancy pct
  mean: number; // same-hour mean across days
  z: number;
}

/** Z-score anomalies: |z| ≥ 2.5 on the hourly occupancy matrix. */
export function detectAnomalies(world: AnaSession[], threshold = 2.5): AnomalyItem[] {
  const days = anaDays(world);
  const matrix = occupancyMatrix(world);
  const n = days.length;
  const out: AnomalyItem[] = [];
  for (let h = 0; h < ANA_HOURS; h++) {
    const values = matrix.map((row) => row[h]);
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
    if (sd < 0.01) continue;
    days.forEach((d, di) => {
      const z = (values[di] - mean) / sd;
      if (Math.abs(z) >= threshold) {
        out.push({ date: d, hour: ANA_HOUR_START + h, value: values[di], mean: Math.round(mean), z: Number(z.toFixed(2)) });
      }
    });
  }
  return out.sort((a, b) => Math.abs(b.z) - Math.abs(a.z)).slice(0, 8);
}

// ───────────────────── revenue ─────────────────────

export interface DayRevenue {
  date: string;
  service: number;
  fines: number;
  total: number;
}

export function revenueAgg(world: AnaSession[]): DayRevenue[] {
  const map = new Map<string, DayRevenue>();
  for (const s of world) {
    const row = map.get(s.date) ?? { date: s.date, service: 0, fines: 0, total: 0 };
    row.service += s.serviceFee;
    row.fines += s.overtimeFee;
    row.total += s.total;
    map.set(s.date, row);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// ───────────────────── what-if simulator ─────────────────────

/**
 * What-if: re-price every session with overridden reserve prices per tier
 * (walk-in = reserve + 10K surcharge, v22 model) and recompute 30-day revenue.
 */
export function simulate(world: AnaSession[], overrides: Partial<Record<DemandTier, number>>): {
  base: number;
  simulated: number;
  deltaPct: number;
} {
  const base = world.reduce((a, s) => a + s.total, 0);
  const simulated = world.reduce((a, s) => {
    const reserve = overrides[s.tier] ?? DEMAND_TIERS[s.tier].advanceFee;
    const fee = s.isAdvance ? reserve : reserve + (DEMAND_TIERS[s.tier].walkInFee - DEMAND_TIERS[s.tier].advanceFee);
    return a + fee + s.overtimeFee;
  }, 0);
  return { base, simulated, deltaPct: base > 0 ? ((simulated - base) / base) * 100 : 0 };
}

// ───────────────────── CSV export ─────────────────────

/** Analytics-ready CSV — the late_fee column replaced parking_fee in v22. */
export function analyticsCsv(world: AnaSession[]): string {
  const header = "date,start_hour,duration_min,type,tier,service_fee,late_fee,total";
  const rows = [...world]
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin)
    .map((s) =>
      [
        s.date,
        String(Math.floor(s.startMin / 60)).padStart(2, "0") + ":" + String(s.startMin % 60).padStart(2, "0"),
        s.durMin,
        s.isAdvance ? "advance" : "walkin",
        s.tier,
        s.serviceFee,
        s.overtimeFee,
        s.total,
      ].join(",")
    );
  return [header, ...rows].join("\r\n");
}
