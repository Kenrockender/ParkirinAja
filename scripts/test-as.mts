/**
 * Quick unit checks for the Alam Sutera & Bekasi open-lot worlds.
 * Run: npx tsx scripts/test-as.mts
 */
import {
  buildAlamSuteraSlots,
  buildBekasiSlots,
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
check("bekasi is available (replaced Malang)", campusById("bekasi").available === true);
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

console.log("— buildBekasiSlots —");
const bkSlots = buildBekasiSlots();
const bkA = bkSlots.filter((s) => s.rowLabel === "A");
const bkB = bkSlots.filter((s) => s.rowLabel === "B");
check("50 slots total", bkSlots.length === 50, `${bkSlots.length}`);
check("row A has 25", bkA.length === 25);
check("row B has 25", bkB.length === 25);
check("all ids prefixed bk-", bkSlots.every((s) => s.id.startsWith("bk-")));
check(
  "no id collision with Anggrek/AS",
  !bkSlots.some((s) => [...buildSlots(), ...buildAlamSuteraSlots()].some((o) => o.id === s.id))
);
const bkMaint = bkSlots.filter((s) => s.status === "MAINTENANCE");
check(
  "2 maintenance bays (A-07, B-15)",
  bkMaint.length === 2 && bkMaint.every((s) => ["A-07", "B-15"].includes(s.slotNumber)),
  bkMaint.map((s) => s.slotNumber).join(",")
);

console.log("— Bekasi campus helpers —");
check("bekasi location label", campusById("bekasi").location === "BINUS @ Bekasi · Area Parkir");
check("bekasi city", campusById("bekasi").city === "Kota Bekasi");
check("bekasi layout openlot", campusById("bekasi").layout === "openlot");
check("prefix BKS for bekasi", campusCodePrefix("bekasi") === "BKS");
check("campusForSlot bk-A-3", campusForSlot("bk-A-3") === "bekasi");
check("campusForSlot bk-B-24", campusForSlot("bk-B-24") === "bekasi");

console.log("— demand math for the Bekasi seeded world —");
// Seed design: 17 CHECKED_IN + 3 CONFIRMED overlapping now, on 48 active bays.
const bkActive = bkSlots.length - bkMaint.length;
check("48 active bays", bkActive === 48, `${bkActive}`);
const bkTaken = 20;
const bkPct = Math.round((bkTaken / bkActive) * 100);
check("20/48 = 42% → NORMAL", bkPct === 42 && demandTierFor(bkPct) === "NORMAL", `${bkPct}% → ${demandTierFor(bkPct)}`);
const bkEmpty = demandNow(bkSlots, []);
check("empty BK lot → LOW", bkEmpty.tier === "LOW" && bkEmpty.active === 48, `${bkEmpty.pct}% · ${bkEmpty.tier}`);

// ───────────── v22 pricing model (recovery) ─────────────
console.log("— v22: no parking fee, late fine only —");
const pd = await import("../src/lib/parking-data");
check("TARIFF tanpa kunci park*", !("parkFirstHours" in pd.TARIFF || "parkFirstHoursFee" in pd.TARIFF || "parkAddHourFee" in pd.TARIFF || "parkMaxFee" in pd.TARIFF));
check("TARIFF punya walkInSurcharge 10K", pd.TARIFF.walkInSurcharge === 10000);
check("parkingFee() dihapus", typeof (pd as Record<string, unknown>).parkingFee === "undefined");
check("denda 20 menit → 5K (contoh user)", pd.overtimeFee(20) === 5000);
check("denda 90 menit → 10K (contoh user)", pd.overtimeFee(90) === 10000);
check("denda 61 menit → 10K (ceil per jam dimulai)", pd.overtimeFee(61) === 10000);
check("denda 0/negatif → 0", pd.overtimeFee(0) === 0 && pd.overtimeFee(-30) === 0);
check("denda 600 menit → 50K (tanpa cap)", pd.overtimeFee(600) === 50000);
check("i18n: onTimeFree ada (ID & EN)", pd.tr("id", "onTimeFree").length > 5 && pd.tr("en", "onTimeFree").length > 5);
check("i18n: estOvertime = Estimasi denda telat", pd.tr("id", "estOvertime") === "Estimasi denda telat");
check("i18n: tParkingFee hilang (fallback ke key)", pd.tr("id", "tParkingFee" as never) === "tParkingFee");

// ───────────── v25 brands & geometry ─────────────
console.log("— v25: car brands & L2 ramp geometry —");
check("25 merek mobil", pd.CAR_BRANDS.length === 25, String(pd.CAR_BRANDS.length));
check("Toyota pertama, Volvo terakhir", pd.CAR_BRANDS[0] === "Toyota" && pd.CAR_BRANDS[24] === "Volvo");
check("merek EV ada (BYD, Wuling, Chery)", ["BYD", "Wuling", "Chery"].every((b) => pd.CAR_BRANDS.includes(b)));
check("7 tipe bodi", pd.CAR_BODY_TYPES.length === 7);
check("L2RAMP_BLOCK_W 96/112", pd.L2RAMP_BLOCK_W.compact === 96 && pd.L2RAMP_BLOCK_W.full === 112);
check("derivasi 84 + 28 = 112", pd.L2RAMP_BODY_W.full + 2 * pd.L2RAMP_WALL_W + 2 * pd.L2RAMP_GAP === pd.L2RAMP_BLOCK_W.full);
check("derivasi 68 + 28 = 96", pd.L2RAMP_BODY_W.compact + 2 * pd.L2RAMP_WALL_W + 2 * pd.L2RAMP_GAP === pd.L2RAMP_BLOCK_W.compact);

// ───────────── v26 payments ─────────────
console.log("— v26: payment channels —");
check("8 bank VA", pd.VA_BANKS.length === 8);
check("prefix asli (BCA 8808, Mandiri 89508, BNI 9889, BRI 8881)", ["8808", "89508", "9889", "8881"].every((p) => pd.VA_BANKS.some((b) => b.prefix === p)));
const vaFixed = pd.vaNumberFor("8808", 100000, () => 0.42);
check("VA 16 digit", vaFixed.length === 16, vaFixed);
check("VA diawali prefix bank", vaFixed.startsWith("8808"));
check("VA deterministik dengan rnd injeksi", pd.vaNumberFor("8808", 100000, () => 0.42) === vaFixed);
check("groupVa 4-4-4-4", pd.groupVa("8808123456789012") === "8808 1234 5678 9012");
check("Luhn valid 4242…", pd.luhnValid("4242424242424242") === true);
check("Luhn invalid 4242…1", pd.luhnValid("4242424242424241") === false);
check("Luhn reject pendek", pd.luhnValid("42424242") === false);
check("expiryValid 12/30 ok", pd.expiryValid("12/30", new Date("2026-09-20")) === true);
check("expiryValid 01/26 lewat", pd.expiryValid("01/26", new Date("2026-09-20")) === false);
check("expiryValid format salah", pd.expiryValid("13/2x") === false);
check("cardBrand Visa/MC/JCB", pd.cardBrand("4242424242424242") === "Visa" && pd.cardBrand("5500005555555559") === "Mastercard" && pd.cardBrand("3566002020360505") === "JCB");
const qr = pd.qrisPayload(50000, new Date("2026-09-20T10:00:00"));
check("QRIS payload: merchant + NMID + amount + TS", qr.includes("PARKIR BINUS KEMANGGISAN") && qr.includes("NMID") && qr.includes("50000") && qr.includes("2026-09-20"));
check("maskPlate privasi", pd.maskPlate("B 2741 AKL") === "B 2••• •KL");
check("i18n payDialog/endSoon/avatar (ID & EN)", ["payDialogTitle", "endSoonTitle", "avatarChange"].every((k) => pd.tr("id", k as never) !== k && pd.tr("en", k as never) !== k));

// ───────────── i18n parity ID/EN (spot check semua kunci baru) ─────────────
console.log("— i18n parity kunci v23–v26 —");
const NEW_KEYS = [
  "opTabHarga", "opTabAnalytics", "opTabFinance", "opTabAudit", "opTabSystem",
  "liveTitle", "liveGuestLegend", "liveMapNote",
  "finJournalTitle", "finTrialBalanced", "finBepTitle",
  "invTitle", "cfTitle",
  "auditSessionTitle", "auditLogTitle", "aForceCheckout", "aProfileUpdate",
  "apiTitle", "epSlots", "archTitle", "erdTitle", "stackTitle", "chgTitle", "chgV18", "chgV26",
  "anprTitle", "promoTitle",
  "anaKpiMape", "anaForecastTitle", "anaWhatIfTitle",
  "brandSearchPh", "brandOther", "fBodyType",
  "topUpCustom", "topUpMinErr",
  "editProfile", "epNim", "epNimInvalid",
  "payVa", "payCard", "payQris", "payVaNumber", "payCardCvvErr",
  "endSoonTitle", "endSoonBody", "endSoonToast",
  "avatarChange", "avatarTooBig",
];
check(
  `semua ${NEW_KEYS.length} kunci baru punya nilai ID & EN (bukan fallback)`,
  NEW_KEYS.every((k) => {
    const id = pd.tr("id", k as never);
    const en = pd.tr("en", k as never);
    return id !== k && en !== k && id.length > 1 && en.length > 1;
  })
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
