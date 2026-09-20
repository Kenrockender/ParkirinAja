/**
 * test-analytics.mts — deterministic 30-day dataset + derivations (v18/v22 recovery).
 * Run: bun scripts/test-analytics.mts
 */
import {
  ANA_DAYS,
  ANA_HOURS,
  analyticsCsv,
  anaDays,
  buildAnalyticsWorld,
  detectAnomalies,
  heatmapMatrix,
  holtWintersForecast,
  hourlyOccupancySeries,
  plannedWindowMin,
  revenueAgg,
  simulate,
} from "../src/lib/analytics";
import { DEMAND_TIERS } from "../src/lib/parking-data";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ok  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail++;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const T0 = new Date("2026-09-19T10:00:00").getTime();
const world = buildAnalyticsWorld(T0);
const world2 = buildAnalyticsWorld(T0);

console.log("— dataset deterministik —");
check("dua build identik", JSON.stringify(world) === JSON.stringify(world2));
check("30 hari", anaDays(world).length === ANA_DAYS);
check("≥ 1000 sesi", world.length >= 1000, String(world.length));
check("tanggal unik & terurut", anaDays(world).every((d, i, a) => i === 0 || d > a[i - 1]));

console.log("— v22 fee model pada dataset —");
check("plannedWindowMin walk-in = 120", plannedWindowMin(false, 999) === 120);
check("advance 60/120/180 by dur%3", [60, 120, 180].includes(plannedWindowMin(true, 61)));
check("walk-in fee selalu ≥ advance fee", world.every((s) => DEMAND_TIERS[s.tier].walkInFee >= DEMAND_TIERS[s.tier].advanceFee));
check("total = service + denda", world.every((s) => s.total === s.serviceFee + s.overtimeFee));
check("ada sesi dengan denda", world.some((s) => s.overtimeFee > 0));
check("denda kelipatan 5.000", world.every((s) => s.overtimeFee % 5000 === 0));

console.log("— ritme kalender (Sabtu sepi, getDay-based) —");
const rev = revenueAgg(world);
const avg = (dow: number) => {
  const rows = rev.filter((r) => new Date(`${r.date}T00:00:00`).getDay() === dow);
  return rows.reduce((a, r) => a + r.total, 0) / rows.length;
};
const sat = avg(6);
const tue = avg(2);
check("Sabtu ≪ Selasa", sat < tue * 0.75, `Sabtu ${Math.round(sat)} vs Selasa ${Math.round(tue)}`);
const dailyAvg = rev.reduce((a, r) => a + r.total, 0) / rev.length;
check("rata-rata harian wajar 0,8–2,5 jt", dailyAvg > 800_000 && dailyAvg < 2_500_000, `${Math.round(dailyAvg)}`);

console.log("— heatmap & occupancy —");
const heat = heatmapMatrix(world);
check("7 × 15", heat.length === 7 && heat[0].length === ANA_HOURS);
check("nilai 0–100", heat.every((row) => row.every((v) => v >= 0 && v <= 100)));
const series = hourlyOccupancySeries(world);
check("seri jamuan 14×24 = 336 poin", series.length === 336);

console.log("— forecast Holt-Winters —");
const f = holtWintersForecast(series);
check("48 poin forecast", f.forecast.length === 48);
check("MAPE < 25%", f.mape < 25, `${f.mape.toFixed(1)}%`);
check("semua ≥ 0", f.forecast.every((v) => v >= 0));
check("pita hi ≥ lo", f.band.hi.every((v, i) => v >= f.band.lo[i]));

console.log("— anomali z-score —");
const anomalies = detectAnomalies(world);
check("ada anomali (hari event)", anomalies.length > 0, `${anomalies.length} item`);
check("|z| ≥ 2.5 semua", anomalies.every((a) => Math.abs(a.z) >= 2.5));

console.log("— what-if —");
const simBase = simulate(world, {});
check("base = Σ total", simBase.base === world.reduce((a, s) => a + s.total, 0));
const simHigh = simulate(world, { LOW: 25000, NORMAL: 25000, HIGH: 25000 });
check("naikkan harga → pendapatan naik", simHigh.simulated > simBase.base && simHigh.deltaPct > 0, `Δ ${simHigh.deltaPct.toFixed(1)}%`);
const simLow = simulate(world, { LOW: 10000 });
check("turunkan LOW → delta < simHigh", simLow.deltaPct < simHigh.deltaPct);

console.log("— CSV —");
const csv = analyticsCsv(world);
const lines = csv.split("\r\n");
check("header + N baris", lines.length === world.length + 1);
check("kolom late_fee (v22)", lines[0].includes("late_fee") && !lines[0].includes("parking_fee"));
check("baris data mengandung koma 8 kolom", lines[1].split(",").length === 8);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
