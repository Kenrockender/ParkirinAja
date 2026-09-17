/**
 * Quick unit checks for the Alam Sutera open-lot world.
 * Run: npx tsx scripts/test-as.mts
 */
import {
  buildAlamSuteraSlots,
  buildSlots,
  campusById,
  campusCodePrefix,
  campusForSlot,
  demandNow,
  demandTierFor,
} from "../src/lib/parking-data";

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

console.log("— buildAlamSuteraSlots —");
const asSlots = buildAlamSuteraSlots();
const rowA = asSlots.filter((s) => s.rowLabel === "A");
const rowB = asSlots.filter((s) => s.rowLabel === "B");
check("40 slots total", asSlots.length === 40, `${asSlots.length}`);
check("row A has 20", rowA.length === 20);
check("row B has 20", rowB.length === 20);
check("all ids prefixed as-", asSlots.every((s) => s.id.startsWith("as-")));
check("no id collision with Anggrek", !asSlots.some((s) => buildSlots().some((a) => a.id === s.id)));
const maint = asSlots.filter((s) => s.status === "MAINTENANCE");
check("2 maintenance bays (A-07, B-15)", maint.length === 2 && maint.every((s) => ["A-07", "B-15"].includes(s.slotNumber)), maint.map((s) => s.slotNumber).join(","));

console.log("— campus helpers —");
check("alamsutera is available", campusById("alamsutera").available === true);
check("malang still coming soon", campusById("malang").available === false);
check("location label", campusById("alamsutera").location === "BINUS @ Alam Sutera · Area Parkir");
check("layout openlot", campusById("alamsutera").layout === "openlot");
check("anggrek layout building", campusById("anggrek").layout === "building");
check("prefix AS for alamsutera", campusCodePrefix("alamsutera") === "AS");
check("prefix PB for anggrek", campusCodePrefix("anggrek") === "PB");
check("campusForSlot as-A-3", campusForSlot("as-A-3") === "alamsutera");
check("campusForSlot slot-B-14", campusForSlot("slot-B-14") === "anggrek");

console.log("— demand math for the seeded world —");
// Seed design: 13 CHECKED_IN + 3 CONFIRMED overlapping now, on 38 active bays.
const active = asSlots.length - maint.length;
check("38 active bays", active === 38, `${active}`);
const taken = 16;
const pct = Math.round((taken / active) * 100);
check("16/38 = 42% → NORMAL", pct === 42 && demandTierFor(pct) === "NORMAL", `${pct}% → ${demandTierFor(pct)}`);
// Empty-lot demand (no reservations) must be LOW.
const empty = demandNow(asSlots, []);
check("empty AS lot → LOW", empty.tier === "LOW" && empty.active === 38, `${empty.pct}% · ${empty.tier}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
