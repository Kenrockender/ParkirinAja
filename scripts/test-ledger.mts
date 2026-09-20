/**
 * test-ledger.mts — double-entry engine checks (v23 recovery).
 * Run: bun scripts/test-ledger.mts
 */
import {
  BEP_DEFAULTS,
  breakEven,
  buildJournal,
  cashPosition,
  COA,
  postTransaction,
  profitAndLoss,
  rupiahShort,
  trialBalance,
  type JournalEntry,
} from "../src/lib/ledger";

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

console.log("— chart of accounts —");
check("5 akun", COA.length === 5, COA.map((a) => a.code).join(", "));
check("kode akun unik", new Set(COA.map((a) => a.code)).size === 5);

console.log("— posting rules (per TxnType) —");
const T = (id: string, type: "TOP_UP" | "SERVICE_FEE" | "OVERTIME" | "REFUND", amount: number) => ({
  id,
  type,
  amount,
  createdAt: 1,
  note: "PB-X",
});

const topUp = postTransaction(T("t1", "TOP_UP", 300000));
check(
  "TOP_UP → Dr Kas / Cr Utang",
  !!topUp && topUp.lines[0].account === "1-1100" && topUp.lines[0].dr === 300000 && topUp.lines[1].account === "2-2100" && topUp.lines[1].cr === 300000
);
const svc = postTransaction(T("t2", "SERVICE_FEE", 100000));
check(
  "SERVICE_FEE → Dr Utang / Cr Pendapatan Layanan",
  !!svc && svc.lines[0].account === "2-2100" && svc.lines[1].account === "4-4100" && svc.lines[1].cr === 100000
);
const fine = postTransaction(T("t3", "OVERTIME", 5000));
check(
  "OVERTIME → Dr Utang / Cr Pendapatan Denda",
  !!fine && fine.lines[0].account === "2-2100" && fine.lines[1].account === "4-4200" && fine.lines[1].cr === 5000
);
const refund = postTransaction(T("t4", "REFUND", 50000));
check(
  "REFUND → Dr Beban Refund / Cr Utang",
  !!refund && refund.lines[0].account === "5-5100" && refund.lines[0].dr === 50000 && refund.lines[1].account === "2-2100"
);
check("zero-amount → null", postTransaction(T("t5", "REFUND", 0)) === null);

console.log("— per-entry Σdr = Σcr —");
const txns = [T("t1", "TOP_UP", 300000), T("t2", "SERVICE_FEE", 100000), T("t3", "OVERTIME", 5000), T("t4", "REFUND", 50000)];
const journal: JournalEntry[] = buildJournal(txns);
check("4 entri (semua txns valid)", journal.length === 4);
check(
  "setiap entri seimbang",
  journal.every((e) => e.lines.reduce((a, l) => a + l.dr, 0) === e.lines.reduce((a, l) => a + l.cr, 0))
);
check("newest first", journal[0].at >= journal[journal.length - 1].at);

console.log("— trial balance —");
const tb = trialBalance(journal);
check("Dr = Cr", tb.totalDr === tb.totalCr, `${tb.totalDr} vs ${tb.totalCr}`);
check("balanced flag", tb.balanced === true);

console.log("— v23 case: Kas 300K / Utang 250K —");
const tb2 = trialBalance(buildJournal([T("a", "TOP_UP", 300000), T("b", "SERVICE_FEE", 50000)]));
check("Dr = Cr = 300K", tb2.totalDr === 300000 && tb2.totalCr === 300000);
const utang = tb2.rows.find((r) => r.account === "2-2100");
check("Utang bersih 250K (Cr)", utang?.cr === 250000, `cr=${utang?.cr}`);

console.log("— persamaan akuntansi: Kas − Utang = Laba —");
const cp = cashPosition(journal);
check(
  "300K − 245K = 55K",
  cp.cash === 300000 && cp.liability === 245000 && cp.netIncome === 55000 && cp.cash - cp.liability === cp.netIncome,
  `${cp.cash} − ${cp.liability} = ${cp.netIncome}`
);

console.log("— persamaan saat Utang flip ke debit (receivable) —");
const txnsFlip = [
  T("f1", "TOP_UP", 300000),
  T("f2", "SERVICE_FEE", 1200000),
  T("f3", "OVERTIME", 100000),
];
const cpFlip = cashPosition(buildJournal(txnsFlip));
check(
  "utang bersih negatif → persamaan tetap: Kas − UtangNet = NI",
  cpFlip.cash - cpFlip.liability === cpFlip.netIncome && cpFlip.liability < 0,
  `Kas ${cpFlip.cash} − UtangNet ${cpFlip.liability} = NI ${cpFlip.netIncome}`
);

console.log("— P&L —");
const pl = profitAndLoss(journal);
check("service 100K", pl.service === 100000);
check("fines 5K", pl.fines === 5000);
check("refunds 50K", pl.refunds === 50000);
check("net = 55K", pl.netIncome === 55000);

console.log("— break-even —");
const bep = breakEven({ fixed: 15_000_000, variable: 2_500, arpu: 22_500, runRateSessions: 937 });
check("CM 20K", bep.cm === 20000);
check("BEP 750 sesi", bep.bepSessions === 750);
check("safety +25%", Math.abs(bep.safetyPct - 24.9) < 0.5, `${bep.safetyPct.toFixed(1)}%`);
const bepNeg = breakEven({ fixed: 15_000_000, variable: 2_500, arpu: 22_500, runRateSessions: 375 });
check("safety −50%", Math.abs(bepNeg.safetyPct + 50) < 0.5, `${bepNeg.safetyPct.toFixed(1)}%`);
check("CM ≤ 0 → ∞", breakEven({ fixed: 100, variable: 30_000, arpu: 22_500, runRateSessions: 500 }).bepSessions === Infinity);
check("BEP_DEFAULTS 15jt / 2,5rb", BEP_DEFAULTS.fixed === 15_000_000 && BEP_DEFAULTS.variable === 2_500);

console.log("— rupiahShort —");
check("1,5 jt", rupiahShort(1_500_000) === "1,5 jt");
check("75 rb", rupiahShort(75_000) === "75 rb");
check("2,3 M", rupiahShort(2_300_000_000).includes("M"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
