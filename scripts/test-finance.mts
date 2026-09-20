/**
 * test-finance.mts — PPN invoicing (v24) + cash-flow projection (v24) checks.
 * Run: bun scripts/test-finance.mts
 */
import { buildInvoices, monthKey, ppnRecap, splitPpn } from "../src/lib/invoice";
import { projectCashflow } from "../src/lib/cashflow";
import { revenueAgg, buildAnalyticsWorld } from "../src/lib/analytics";
import type { Reservation, Txn } from "../src/lib/parking-data";

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

const TX = (id: string, type: Txn["type"], amount: number, at: Date): Txn => ({
  id,
  type,
  amount,
  createdAt: at.getTime(),
  note: "PB-X",
});

console.log("— splitPpn (DPP + PPN === gross) —");
for (const gross of [5000, 15000, 20000, 25000, 30000, 40000, 100000, 1234567]) {
  const { dpp, ppn } = splitPpn(gross);
  check(
    `gross ${gross}: DPP+PPN=gross`,
    dpp + ppn === gross,
    `dpp=${dpp} ppn=${ppn} (${((ppn / dpp) * 100).toFixed(1)}%)`
  );
}
check("≈11% untuk semua nominal", [20000, 100000, 1234567].every((g) => Math.abs(splitPpn(g).ppn / splitPpn(g).dpp - 0.11) < 0.003));
check("zero → 0/0", splitPpn(0).dpp === 0 && splitPpn(0).ppn === 0);

console.log("— buildInvoices —");
const txns: Txn[] = [
  TX("t1", "TOP_UP", 100000, new Date("2026-08-05T10:00:00")),
  TX("t2", "SERVICE_FEE", 20000, new Date("2026-08-05T10:05:00")),
  TX("t3", "OVERTIME", 5000, new Date("2026-08-05T12:00:00")),
  TX("t4", "REFUND", 10000, new Date("2026-08-06T09:00:00")),
  TX("t5", "SERVICE_FEE", 30000, new Date("2026-09-01T08:00:00")),
  TX("t6", "SERVICE_FEE", 25000, new Date("2026-09-02T08:00:00")),
  TX("t7", "OVERTIME", 10000, new Date("2026-09-02T09:00:00")),
];
const resv: Reservation[] = [
  {
    id: "r1",
    code: "PB-X",
    type: "ADVANCE",
    slotId: "slot-A-01",
    slotNumber: "A-01",
    date: "2026-08-05",
    startTime: "08:00",
    endTime: "10:00",
    status: "COMPLETED",
    serviceFee: 20000,
    overtimeFee: 0,
    refundAmount: 0,
    vehiclePlate: "B 2143 RWZ",
    vehicleName: "Honda HR-V",
    driverName: "Rizky Pratama",
    createdAt: 0,
  },
];
const invoices = buildInvoices(txns, resv);
check("5 faktur dari 7 txn (TOP_UP & REFUND excluded)", invoices.length === 5, String(invoices.length));
check("newest first", invoices[0].at >= invoices[1].at);
check(
  "penomoran per bulan berurutan",
  invoices.some((i) => i.id === "INV-202608-0001") &&
    invoices.some((i) => i.id === "INV-202608-0002") &&
    invoices.some((i) => i.id === "INV-202609-0001") &&
    invoices.some((i) => i.id === "INV-202609-0003"),
  invoices.map((i) => i.id).join(", ")
);
check("regex serial", invoices.every((i) => /^INV-\d{6}-\d{4}$/.test(i.id)));
check("buyer lookup dari reservasi", invoices.find((i) => i.id === "INV-202608-0001")?.buyer === "Rizky Pratama");
const unknown = buildInvoices([TX("tz", "SERVICE_FEE", 20000, new Date("2026-09-03T10:00:00"))], []);
check("buyer fallback Pelanggan Umum", unknown[0]?.buyer === "Pelanggan Umum" && unknown[0]?.plate === "-");
check("setiap DPP+PPN===gross", invoices.every((i) => i.dpp + i.ppn === i.gross));

console.log("— ppnRecap —");
const recap = ppnRecap(invoices);
check("bulan ascending", recap.months[0].month < recap.months[recap.months.length - 1].month);
check("Σ bulanan = total", recap.totals.count === invoices.length && recap.months.reduce((a, m) => a + m.count, 0) === recap.totals.count);
check("Σ dpp konsisten", recap.months.reduce((a, m) => a + m.dpp, 0) === recap.totals.dpp);
check("monthKey format", monthKey("2026-09-20") === "2026-09" && monthKey(new Date("2026-08-01T00:00:00").getTime()) === "2026-08");

console.log("— cashflow projection —");
const world = buildAnalyticsWorld(new Date("2026-09-19T10:00:00").getTime());
const rev = revenueAgg(world);
const cf = projectCashflow(rev);
const cf2 = projectCashflow(rev);
check("deterministik (2× sama)", JSON.stringify(cf) === JSON.stringify(cf2));
check("10 aktual + 14 forecast = 24 hari", cf.days.length === 24);
check("kalender tanpa gap", cf.days.every((d, i) => (i === 0 || new Date(d.date).getTime() - new Date(cf.days[i - 1].date).getTime() === 86400000)));
check("14 poin forecast ≥ 0", cf.days.slice(10).every((d) => d.forecast >= 0));
check("pita hi ≥ lo", cf.days.slice(10).every((d) => d.hi >= d.lo));
check("total = Σ forecast", cf.total === cf.days.slice(10).reduce((a, d) => a + d.forecast, 0));
check("avg = total/14", cf.avg === Math.round(cf.total / 14));
check("wajar: 0,5–3 jt/hari", cf.avg > 500_000 && cf.avg < 3_000_000, `avg ${cf.avg}`);
check("Δ dalam rentang masuk akal (±60%)", Math.abs(cf.deltaPct) < 60, `${cf.deltaPct.toFixed(1)}%`);
const empty = projectCashflow([]);
check("input kosong tidak crash", empty.days.length === 24 && empty.total >= 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
