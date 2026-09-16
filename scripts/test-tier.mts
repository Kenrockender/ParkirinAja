/** Boundary test for dynamic pricing tier logic + demandNow against a fake slot list. */
import { demandTierFor, demandNow, DEMAND_TIERS, buildSlots } from "../src/lib/parking-data";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ ${name}`);
  }
}

console.log("demandTierFor boundaries (user spec: <40 LOW, 40–75 NORMAL, >75 HIGH):");
check("0% → LOW", demandTierFor(0) === "LOW");
check("39% → LOW", demandTierFor(39) === "LOW");
check("40% → NORMAL", demandTierFor(40) === "NORMAL");
check("50% → NORMAL", demandTierFor(50) === "NORMAL");
check("75% → NORMAL", demandTierFor(75) === "NORMAL");
check("76% → HIGH", demandTierFor(76) === "HIGH");
check("100% → HIGH", demandTierFor(100) === "HIGH");

console.log("price ladder:");
check("LOW 15K/25K", DEMAND_TIERS.LOW.advanceFee === 15000 && DEMAND_TIERS.LOW.walkInFee === 25000);
check("NORMAL mirrors TARIFF 20K/30K", DEMAND_TIERS.NORMAL.advanceFee === 20000 && DEMAND_TIERS.NORMAL.walkInFee === 30000);
check("HIGH 30K/35K", DEMAND_TIERS.HIGH.advanceFee === 30000 && DEMAND_TIERS.HIGH.walkInFee === 35000);

console.log("demandNow on synthetic worlds:");
const slots = buildSlots(); // 32 slots, 2 maintenance → 30 active
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const startTime = `${String(now.getHours()).padStart(2, "0")}:${String(Math.max(0, now.getMinutes() - 1)).padStart(2, "0")}`;
const endTime = `${String(now.getHours()).padStart(2, "0")}:${String(Math.min(59, now.getMinutes() + 1)).padStart(2, "0")}`;
const mkRes = (slotId: string, i: number) => ({
  id: `r${i}`,
  code: `PB-TST${1000 + i}`,
  type: "WALK_IN" as const,
  slotId,
  slotNumber: slotId.replace("slot-", "").replace("-", "-"),
  date: today,
  startTime,
  endTime,
  status: "CHECKED_IN" as const,
  serviceFee: 25000,
  parkingFee: 0,
  overtimeFee: 0,
  refundAmount: 0,
  vehiclePlate: "B 1234 TST",
  vehicleName: "Test",
  driverName: "Tester",
  createdAt: now.getTime() - 3600_000,
  checkedInAt: now.getTime() - 3600_000,
});

// 5 of 30 occupied → 17% → LOW
const d1 = demandNow(slots, [1, 2, 3, 4, 5].map((n) => mkRes(`slot-A-${n}`, n)), now.getTime());
check("5/30 = 17% → LOW", d1.pct === 17 && d1.tier === "LOW");
check("counts occupied=5 active=30", d1.occupied === 5 && d1.active === 30);

// 13 of 30 → 43% → NORMAL
const d2 = demandNow(
  slots,
  Array.from({ length: 13 }, (_, i) => mkRes(`slot-A-${i + 1}`, i)),
  now.getTime()
);
check("13/30 = 43% → NORMAL", d2.pct === 43 && d2.tier === "NORMAL");

// 24 walk-ins but A-14 is MAINTENANCE → 23 of 30 active → 77% → HIGH
// (also proves maintenance slots are excluded from the demand denominator)
const d3 = demandNow(
  slots,
  Array.from({ length: 24 }, (_, i) => mkRes(i < 18 ? `slot-A-${i + 1}` : `slot-B-${i - 17}`, i)),
  now.getTime()
);
check("24 res but A-14 maintenance → 23/30 = 77% → HIGH", d3.pct === 77 && d3.tier === "HIGH");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
