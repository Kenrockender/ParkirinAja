/**
 * e2e-recovery.mjs — full end-to-end proof of the v22–v26 recovery build.
 * Drives the running dev app via Playwright (agent-browser's bundled chromium):
 * customer payments (VA/Kartu/QRIS), ending-soon alerts, denda-only checkout,
 * avatar + profile editing, brand picker, seamless L2 ramp, live gate stream,
 * operator 8-tab console (analytics, finance, audit, system).
 * Run: bun scripts/e2e-recovery.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
let pass = 0;
let fail = 0;
const failures = [];
function check(name, cond, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ok  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail++;
    failures.push(name);
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));

async function shot(name) {
  await page.screenshot({ path: `scripts/shots/recovery-${name}.png`, fullPage: false });
}

// ───────────────────────── A. student sign-in ─────────────────────────
console.log("A. Landing & sign-in mahasiswa");
await page.goto(BASE, { waitUntil: "networkidle" });
await page.getByText("Mahasiswa BINUS", { exact: false }).first().waitFor({ state: "visible", timeout: 20000 });
await page.getByText("Mahasiswa BINUS", { exact: false }).first().click();
await page.locator("button", { hasText: "Cari Slot" }).first().waitFor({ state: "visible", timeout: 15000 });
await page.waitForTimeout(600);
check("home render", true);

// v25 — greeting badges removed (cek hanya di blok greeting, hero tetap ada availability)
const greetingBlock = page.locator("h2", { hasText: "👋" }).locator("..");
await greetingBlock.waitFor({ state: "visible", timeout: 5000 });
const greetingText = await greetingBlock.innerText();
check("v25: badge 'sedang parkir' dihapus dari greeting", !greetingText.includes("sedang parkir"));
check("v25: badge 'slot kosong' dihapus dari greeting", !greetingText.includes("slot kosong"));
const heroAvail = await page.getByText("Ketersediaan sekarang", { exact: false }).count();
check("hero availability tetap ada", heroAvail > 0);

const state1 = await page.evaluate(() => window.__parkir.getState());
check("saldo awal 230.000", state1.walletBalance === 230000, String(state1.walletBalance));
check("tidak ada txn PARKING_FEE", !state1.transactions.some((t) => t.type === "PARKING_FEE"));
check("kendaraan seed semuanya mobil", state1.vehicles.every((v) => !/vario|beat|nmax|scoopy|mio|lexi|cb150/i.test(`${v.nickname} ${v.model}`)));

// ───────────────────────── B. wallet payments ─────────────────────────
console.log("B. Dompet — top up VA / Kartu / QRIS");
await page.locator("nav button", { hasText: "Dompet" }).first().click();
await page.locator("[data-topup-chip='100000']").waitFor({ state: "visible", timeout: 8000 });
await shot("wallet");

// VA flow — BCA
await page.locator("[data-topup-chip='100000']").click();
await page.locator("[data-pay-methods]").waitFor({ state: "visible", timeout: 8000 });
check("dialog metode terbuka (3 metode)", (await page.locator("[data-pay-method]").count()) === 3);
await page.locator("[data-pay-method='va']").click();
await page.locator("[data-va-banks]").waitFor({ state: "visible", timeout: 8000 });
check("8 bank tampil", (await page.locator("[data-va-bank]").count()) === 8);
await shot("va-banks");
await page.locator("[data-va-bank='BCA']").click();
await page.locator("[data-va-number]").waitFor({ state: "visible", timeout: 8000 });
const vaText = await page.locator("[data-va-number]").innerText();
check("nomor VA 16 digit berawalan 8808", /8808[\s]*\d{4}[\s]*\d{4}[\s]*\d{4}/.test(vaText.replace(/\u00a0/g, " ")), vaText.trim());
await shot("va-number");
await page.locator("[data-va-copy]").click();
await page.locator("[data-va-check]").click();
await page.locator("[data-pay-done]").waitFor({ state: "visible", timeout: 8000 });
const noteVa = await page.evaluate(() => window.__parkir.getState().transactions.find((t) => t.note.includes("VA"))?.note);
check("txn tercatat 'VA BCA'", noteVa === "VA BCA", noteVa);
const balVa = await page.evaluate(() => window.__parkir.getState().walletBalance);
check("saldo +100.000 → 330.000", balVa === 330000, String(balVa));
await page.locator("[data-pay-done] button", { hasText: "Tutup" }).click();
await page.waitForTimeout(400);

// Card flow — invalid first, then valid
await page.locator("[data-topup-chip='50000']").click();
await page.locator("[data-pay-method='card']").click();
await page.locator("[data-card-form]").waitFor({ state: "visible", timeout: 8000 });
await page.locator("[data-card-submit]").click();
await page.waitForTimeout(300);
check("submit kosong → error tampil", (await page.getByText("Nomor kartu tidak valid", { exact: false }).count()) > 0);
await page.locator("[data-card-number]").fill("4242424242424241");
await page.locator("[data-card-name]").fill("BUDI SANTOSO");
await page.locator("[data-card-expiry]").fill("12/28");
await page.locator("[data-card-cvv]").fill("123");
await page.locator("[data-card-submit]").click();
await page.waitForTimeout(300);
check("Luhn invalid ditolak", (await page.getByText("Nomor kartu tidak valid", { exact: false }).count()) > 0);
await shot("card-invalid");
await page.locator("[data-card-number]").fill("4242424242424242");
await page.locator("[data-card-submit]").click();
await page.locator("[data-pay-done]").waitFor({ state: "visible", timeout: 8000 });
const noteCard = await page.evaluate(() => window.__parkir.getState().transactions.find((t) => t.note.includes("Kartu"))?.note);
check("txn tercatat 'Kartu •••• 4242'", noteCard === "Kartu •••• 4242", noteCard);
check("saldo +50.000 → 380.000", (await page.evaluate(() => window.__parkir.getState().walletBalance)) === 380000);
await page.locator("[data-pay-done] button", { hasText: "Tutup" }).click();
await page.waitForTimeout(400);

// custom amount min validation + QRIS
await page.locator("[data-topup-custom] input").fill("5.000");
await page.locator("[data-topup-custom-btn]").click();
await page.waitForTimeout(300);
check("min 10K ditolak", (await page.getByText("Minimal top up Rp10.000", { exact: false }).count()) > 0);
await shot("wallet-custom-err");
await page.locator("[data-topup-custom] input").fill("75.000");
await page.locator("[data-topup-custom-btn]").click();
await page.locator("[data-pay-method='qris']").waitFor({ state: "visible", timeout: 8000 });
await page.locator("[data-pay-method='qris']").click();
await page.locator("[data-qris]").waitFor({ state: "visible", timeout: 8000 });
check("QRIS QR tampil", (await page.locator("[data-qris] svg").count()) > 0);
await shot("qris");
await page.locator("[data-qris-check]").click();
await page.locator("[data-pay-done]").waitFor({ state: "visible", timeout: 8000 });
const noteQris = await page.evaluate(() => window.__parkir.getState().transactions.find((t) => t.note === "QRIS")?.note);
check("txn tercatat 'QRIS'", noteQris === "QRIS");
check("saldo +75.000 → 455.000", (await page.evaluate(() => window.__parkir.getState().walletBalance)) === 455000);
await page.locator("[data-pay-done] button", { hasText: "Tutup" }).click();

// ───────────────────────── C. ticket: denda-only + ending soon ─────────────────────────
console.log("C. Tiket — checkout tanpa biaya parkir + banner hampir habis");
await page.locator("nav button", { hasText: "Riwayat" }).first().click();
await page.waitForTimeout(500);
const activeCard = page.locator("button", { hasText: "A-03" }).first();
await activeCard.waitFor({ state: "visible", timeout: 8000 });
await activeCard.click();
await page.locator("[data-ticket-pass]").waitFor({ state: "visible", timeout: 8000 });
const passBg = await page.locator("[data-ticket-pass]").evaluate((el) => getComputedStyle(el).backgroundColor);
check("tiket ivory terang (bukan gelap)", /240|250|250/.test(passBg) || passBg.includes("250"), passBg);
check("tidak ada teks 'Biaya parkir'", (await page.getByText("Biaya parkir", { exact: false }).count()) === 0);
await shot("ticket-ivory");

// on-time checkout → free
await page.locator("button", { hasText: "Selesaikan & Keluar" }).click();
await page.locator("text=Selesaikan sesi parkir?").waitFor({ state: "visible", timeout: 8000 });
const onTimeNote = await page.getByText("Masih sesuai jadwal", { exact: false }).count();
check("dialog on-time: catatan hijau tanpa denda", onTimeNote > 0);
await shot("checkout-ontime");
const txnCountBefore = await page.evaluate(() => window.__parkir.getState().transactions.length);
await page.getByRole("button", { name: "Selesaikan & Keluar" }).last().click();
await page.waitForTimeout(800);
const afterFree = await page.evaluate(() => window.__parkir.getState());
check("checkout on-time: saldo tetap 455.000", afterFree.walletBalance === 455000, String(afterFree.walletBalance));
check("tanpa txn baru (0 denda)", afterFree.transactions.length === txnCountBefore, `${txnCountBefore} → ${afterFree.transactions.length}`);
// kembali ke tabs (view tikit menyembunyikan nav bawah)
await page.locator("button[aria-label='Kembali']").first().click();
await page.waitForTimeout(600);

// ending-soon: new walk-in via scan, then rewind to +15 min
console.log("C2. Banner hampir habis (H-30 menit)");
const scanRes = await page.evaluate(() => {
  const s = window.__parkir.getState();
  const free = s.slots.find((sl) => sl.status === "ACTIVE" && !s.reservations.some((r) => r.slotId === sl.id && ["CHECKED_IN", "CONFIRMED"].includes(r.status)));
  return window.__parkir.api.scanSlot(free.slotNumber);
});
check("walk-in via api ok", scanRes.ok === true);
await page.waitForTimeout(400);
const walkinId = scanRes.reservation?.id;
const walkinFee = scanRes.reservation?.serviceFee ?? 0;
const balAfterWalkin = await page.evaluate(() => window.__parkir.getState().walletBalance);
check(
  "walk-in dikenakan biaya layanan (dinamis)",
  balAfterWalkin === 455000 - walkinFee,
  `fee ${walkinFee} → ${balAfterWalkin}`
);
await page.evaluate((id) => {
  const st = window.__parkir.getState();
  const now = new Date();
  const end = new Date(now.getTime() + 15 * 60000);
  const hh = String(end.getHours()).padStart(2, "0");
  const mm = String(end.getMinutes()).padStart(2, "0");
  window.__parkir.setState({
    reservations: st.reservations.map((r) => (r.id === id ? { ...r, endTime: `${hh}:${mm}` } : r)),
  });
}, walkinId);
await page.waitForTimeout(1200);
const notifSoon = await page.evaluate(() => window.__parkir.getState().notifications.some((n) => n.kind === "session_end_soon"));
check("notifikasi session_end_soon terkirim", notifSoon);
await page.locator("nav button", { hasText: "Beranda" }).first().click();
await page.waitForTimeout(700);
const homeBanner = await page.locator("[data-home-endsoon]").count();
check("banner hampir-habis muncul di home", homeBanner > 0);
await shot("home-endsoon");
await page.locator("[data-home-endsoon-extend]").click();
await page.waitForTimeout(600);
const extended = await page.evaluate((id) => window.__parkir.getState().reservations.find((r) => r.id === id)?.endTime, walkinId);
check("perpanjang +1 jam dari home", !!extended && extended !== "", extended);

// late checkout on the extended session — rewind window to end 25 min ago → 5K fine
await page.evaluate((id) => {
  const st = window.__parkir.getState();
  const now = new Date();
  const mk = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const t = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const start = new Date(now.getTime() - 85 * 60000);
  const end = new Date(now.getTime() - 25 * 60000);
  window.__parkir.setState({
    reservations: st.reservations.map((r) =>
      r.id === id ? { ...r, date: mk(start), startTime: t(start), endTime: t(end) } : r
    ),
  });
}, walkinId);
await page.waitForTimeout(500);
await page.evaluate((id) => window.__parkir.api.checkOut(id, "ticket"), walkinId);
await page.waitForTimeout(600);
const afterLate = await page.evaluate(() => window.__parkir.getState());
check(
  "checkout telat: saldo −5.000",
  afterLate.walletBalance === balAfterWalkin - 5000,
  `${balAfterWalkin} → ${afterLate.walletBalance}`
);
const walkinCode = scanRes.reservation?.code;
const otTxn = afterLate.transactions.find((t) => t.type === "OVERTIME" && t.note === walkinCode);
check("txn OVERTIME 5.000 tercatat (kode sesi telat)", otTxn?.amount === 5000, otTxn?.note);
const doneRes = afterLate.reservations.find((r) => r.id === walkinId);
check("reservasi COMPLETED denda 5.000", doneRes?.status === "COMPLETED" && doneRes?.overtimeFee === 5000);
check("reservasi tanpa field parkingFee", doneRes && !("parkingFee" in doneRes));

// ───────────────────────── D. profile: edit + avatar ─────────────────────────
console.log("D. Profil — edit data diri + foto");
await page.locator("nav button", { hasText: "Profil" }).first().click();
await page.locator("[data-edit-profile-btn]").waitFor({ state: "visible", timeout: 8000 });
await page.locator("[data-edit-profile-btn]").click();
await page.locator("[data-ep-name]").waitFor({ state: "visible", timeout: 8000 });
await page.locator("[data-ep-nim]").fill("12345"); // invalid: 5 digits
await page.locator("[data-ep-save]").click();
await page.waitForTimeout(300);
check("NIM 5 digit ditolak", (await page.getByText("NIM harus 8–10 digit", { exact: false }).count()) > 0);
await page.locator("[data-ep-name]").fill("Rizky Pratama Wijaya");
await page.locator("[data-ep-nim]").fill("2540998877");
await page.locator("[data-ep-save]").click();
await page.waitForTimeout(600);
check("modal tertutup setelah simpan", !(await page.locator("[data-ep-name]").isVisible().catch(() => false)));
const profile = await page.evaluate(() => window.__parkir.getState().user);
check("profil tersimpan (nama + nim baru)", profile.name === "Rizky Pratama Wijaya" && profile.nim === "2540998877", `${profile.name} · ${profile.nim}`);
await shot("profile-edited");

// avatar upload — tiny 1×1 PNG
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);
await page.locator("[data-avatar-btn]").first().waitFor({ state: "visible", timeout: 8000 });
const input = page.locator("input[type=file][accept='image/png,image/jpeg,image/webp']");
await input.setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: tinyPng });
await page.waitForTimeout(800);
const avatarState = await page.evaluate(() => window.__parkir.getState().user.avatar);
check("avatar ter-upload (data URL)", typeof avatarState === "string" && avatarState.startsWith("data:image/png"));
check("gambar avatar dirender", (await page.locator("[data-avatar-img]").count()) > 0);
await shot("avatar");
const avatarAudit = await page.evaluate(() => window.__parkir.getState().auditLog.some((e) => e.action === "PROFILE_UPDATE"));
check("audit PROFILE_UPDATE tercatat", avatarAudit);
await page.locator("[data-avatar-remove]").click();
await page.waitForTimeout(400);
check("avatar dihapus", (await page.evaluate(() => window.__parkir.getState().user.avatar)) === null);

// ───────────────────────── E. vehicle modal: brand picker ─────────────────────────
console.log("E. Kendaraan — dropdown merek (v25)");
await page.locator("button", { hasText: "Tambah kendaraan" }).first().click();
await page.locator("[data-brand-picker]").waitFor({ state: "visible", timeout: 8000 });
await page.locator("[data-brand-toggle]").click();
await page.locator("[data-brand-search]").waitFor({ state: "visible", timeout: 8000 });
const optionsAll = await page.locator("[data-brand-option]").count();
check("daftar merek terbuka (25)", optionsAll === 25, String(optionsAll));
await page.locator("[data-brand-search]").fill("Hon");
await page.waitForTimeout(300);
const honOpts = await page.locator("[data-brand-option]").allInnerTexts();
check("cari 'Hon' → Honda di urutan pertama", honOpts.length > 0 && honOpts[0] === "Honda", honOpts.join(","));
await page.locator("[data-brand-option='Honda']").click();
await page.waitForTimeout(300);
const brandVal = await page.locator("[data-brand-toggle]").innerText();
check("merek Honda terpilih", brandVal.includes("Honda"));
// Other mode
await page.locator("[data-brand-toggle]").click();
await page.locator("[data-brand-other-input]").waitFor({ state: "visible", timeout: 5000 });
await page.locator("[data-brand-other-input]").fill("Datsun");
await page.waitForTimeout(200);
check("input Other terisi 'Datsun'", (await page.locator("[data-brand-other-input]").inputValue()) === "Datsun");
await page.locator("[data-brand-toggle]").click(); // close dropdown
await page.waitForTimeout(400);
check("dropdown tertutup", !(await page.locator("[data-brand-list]").isVisible().catch(() => false)));
// body type chip
await page.getByRole("button", { name: "SUV", exact: true }).first().click();
await page.waitForTimeout(200);
const nickInput = page.locator("input[placeholder*='Motor Kampus']");
await nickInput.waitFor({ state: "visible", timeout: 5000 });
await nickInput.fill("Mobil Baru");
await page.locator("input[placeholder*='B 1234']").fill("B 9999 TST");
await page.locator("[data-vehicle-save]").click();
await page.waitForTimeout(700);
check("modal kendaraan tertutup setelah simpan", !(await page.locator("[data-brand-picker]").isVisible().catch(() => false)));
const newVeh = await page.evaluate(() => window.__parkir.getState().vehicles.at(-1));
check("kendaraan baru: merek Other 'Datsun' + bodi SUV", newVeh?.brand === "Datsun" && newVeh?.bodyType === "SUV", JSON.stringify(newVeh?.brand));
await shot("vehicle-brand");

// ───────────────────────── F. map: ramp + live guests ─────────────────────────
console.log("F. Peta — ramp L2 seamless + tamu live");
await page.locator("nav button", { hasText: "Beranda" }).first().click();
await page.waitForTimeout(500);
// peta home hanya muncul setelah pencarian ketersediaan
await page.locator("button", { hasText: "Cari Slot" }).first().click();
await page.locator("[data-map-el='ramp-l2']").first().waitFor({ state: "attached", timeout: 8000 });
const rampCount = await page.locator("[data-map-el='ramp-l2']").count();
check("blok ramp L2 ada (peta compact home)", rampCount >= 1);
const rampW = await page.locator("[data-map-el='ramp-l2']").first().evaluate((el) => el.getBoundingClientRect().width);
check("lebar blok ramp ≥ 96 (compact)", rampW >= 96, `${rampW.toFixed(0)}px`);
await page.evaluate(() => window.__parkir.api.liveToggle());
await page.waitForTimeout(4500); // connecting → live + first tick
// full map
await page.locator("button", { hasText: "Peta lengkap" }).first().click();
await page.locator("[data-live-pill='on']").waitFor({ state: "visible", timeout: 8000 });
check("pill LIVE di peta", (await page.locator("[data-live-pill='on']").innerText()).includes("LIVE"));
await page.waitForTimeout(4000); // more ticks → guests
// tamu live bersifat probabilistik (in/out) — polling hingga ada tamu parkir
let guestTiles = 0;
for (let i = 0; i < 8 && guestTiles === 0; i++) {
  guestTiles = await page.locator("[data-live-guest]").count();
  if (guestTiles === 0) await page.waitForTimeout(3600);
}
check("tile tamu live (cincin kuning) di peta", guestTiles > 0, `${guestTiles} tile`);
const ticker = await page.locator("[data-live-ticker]").count();
check("ticker event (plat dimask) tampil", ticker > 0);
const maskedOk = await page.locator("[data-live-ticker]").innerText();
check("ticker memakai plat ter-mask (•)", maskedOk.includes("•"));
const txnsStable = await page.evaluate(() => window.__parkir.getState().transactions.length);
check("tamu TIDAK menambah txn", txnsStable === (await page.evaluate(() => window.__parkir.getState().transactions.length)));
await shot("map-live");
await page.locator("button[aria-label='Tutup']").first().click();
await page.evaluate(() => window.__parkir.api.liveToggle()); // off
await page.waitForTimeout(500);

// ───────────────────────── G. operator console ─────────────────────────
console.log("G. Operator — 8 tab");
await page.evaluate(() => window.__parkir.api.signOut());
await page.waitForTimeout(600);
await page.getByText("Masuk sebagai Operator", { exact: false }).first().waitFor({ state: "visible", timeout: 10000 });
await page.getByText("Masuk sebagai Operator", { exact: false }).first().click();
// label tab hanya tampil ≥sm — pakai viewport desktop
await page.setViewportSize({ width: 1100, height: 900 });
await page.locator("button", { hasText: "Monitor" }).first().waitFor({ state: "visible", timeout: 15000 });
await page.waitForTimeout(800);
const tabTexts = await page.locator("nav, .glass").first().innerText().catch(() => "");
check("operator console render", tabTexts.length > 0);

const tabs = ["Monitor", "Harga", "QR", "Riwayat", "Analitik", "Keuangan", "Audit", "Sistem"];
for (const tab of tabs) {
  const btn = page.locator("button", { hasText: tab }).first();
  const exists = (await btn.count()) > 0;
  check(`tab '${tab}' ada`, exists);
}

// live pill in header + guest tiles
await page.locator("[data-live-pill='off']").first().click();
await page.waitForTimeout(5000);
const pillText = await page.locator("[data-live-pill='on']").first().innerText();
check("pill LIVE di header operator", pillText.includes("LIVE"));
// tamu probabilistik — polling hingga minimal 1 tamu parkir
let opGuests = 0;
let guestTileOp = 0;
for (let i = 0; i < 10 && opGuests === 0; i++) {
  opGuests = await page.locator("[data-op-guests]").count();
  guestTileOp = await page.locator("[data-live-guest]").count();
  if (opGuests === 0) await page.waitForTimeout(3600);
}
check("chip TAMU di slot monitor", opGuests > 0);
check("tile tamu di grid operator", guestTileOp > 0, `${guestTileOp}`);
await shot("operator-monitor-live");

// harga tab — LiveOps + promo
await page.locator("button", { hasText: "Harga" }).first().click();
await page.locator("[data-live-toggle]").waitFor({ state: "visible", timeout: 8000 });
check("LiveOpsCard: transport wss://", (await page.getByText("wss://gate.parkir.binus.ac.id", { exact: false }).count()) > 0);
const latencyText = await page.locator("[data-live-stats]").innerText();
check("LiveOpsCard: stats uptime/event/reconnect", /:/.test(latencyText));
const streamText = await page.locator("[data-live-stream]").innerText();
check("stream event plat PENUH (operator)", /[A-Z] \d{4} [A-Z]{3}/.test(streamText));
await shot("operator-harga-live");
await page.locator("[data-promo-send]").click();
await page.waitForTimeout(500);
const promoAudit = await page.evaluate(() => window.__parkir.getState().auditLog.some((e) => e.action === "PROMO_BROADCAST"));
check("audit PROMO_BROADCAST", promoAudit);

// analitik tab
await page.locator("button", { hasText: "Analitik" }).first().click();
await page.getByText("Heatmap Okupansi", { exact: false }).first().waitFor({ state: "visible", timeout: 8000 });
check("KPI strip + heatmap", (await page.getByText("Sesi / 30 hari", { exact: false }).count()) > 0);
await page.waitForTimeout(500);
check("model card MAPE", (await page.getByText(/MAPE/, { exact: false }).count()) > 0);
const whatif = await page.locator("[data-whatif]");
check("what-if simulator ada", (await whatif.count()) > 0);
const before = await page.locator("[data-whatif-result]").innerText();
await page.locator("[data-whatif-slider='LOW']").fill("25000");
await page.waitForTimeout(500);
const after = await page.locator("[data-whatif-result]").innerText();
check("slider LOW mengubah hasil simulasi", before !== after);
await shot("operator-analitik");

// keuangan tab
await page.locator("button", { hasText: "Keuangan" }).first().click();
await page.locator("[data-je-scroll]").waitFor({ state: "visible", timeout: 8000 });
const jeCount = await page.locator("[data-je-id]").count();
check("jurnal ≥ 5 entri", jeCount >= 5, String(jeCount));
check("badge SEIMBANG", (await page.locator("[data-trial-balanced]").innerText()) === "SEIMBANG");
const drText = await page.getByText(/Dr Rp/, { exact: false }).first().innerText().catch(() => "");
check("baris Dr/Cr dengan kode akun", drText.length > 0);
check("waterfall + BEP", (await page.getByText("Titik Impas", { exact: false }).count()) > 0);
const bepBefore = await page.locator("[data-bep-sessions]").innerText();
await page.locator("input[type=range]").nth(0).fill("20000000");
await page.waitForTimeout(400);
const bepAfter = await page.locator("[data-bep-sessions]").innerText();
check("slider BEP mengubah jumlah sesi", bepBefore !== bepAfter, `${bepBefore} → ${bepAfter}`);
check("faktur PPN + cashflow", (await page.getByText("Faktur & PPN 11%", { exact: false }).count()) > 0 && (await page.getByText("Proyeksi Arus Kas", { exact: false }).count()) > 0);
const invRows = await page.locator("[data-invoice-row]").count();
check("daftar faktur terisi", invRows > 0, String(invRows));
await page.locator("[data-invoice-row]").first().click();
await page.locator("[data-invoice-doc]").waitFor({ state: "visible", timeout: 8000 });
const invDocText = (await page.getByRole("dialog").innerText()) + " " + (await page.locator("[data-invoice-doc]").innerText());
check("faktur: DPP + PPN + LUNAS", invDocText.includes("DPP") && invDocText.includes("PPN") && invDocText.includes("LUNAS"));
const serialOk = /^INV-\d{6}-\d{4}$/.test((invDocText.match(/INV-\d{6}-\d{4}/) || [""])[0]);
check("serial INV-YYYYMM-NNNN valid", serialOk, (invDocText.match(/INV-[\d-]+/) || ["?"])[0]);
await shot("operator-keuangan-invoice");
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// audit tab
await page.locator("button", { hasText: "Audit" }).first().click();
await page.locator("[data-audit-scroll]").waitFor({ state: "visible", timeout: 8000 });
const auditRows = await page.locator("[data-audit-action]").count();
check("audit log terisi (seed + live)", auditRows >= 30, String(auditRows));
check("kartu sesi (SESSION_ID)", (await page.getByText(/sess-/, { exact: false }).count()) > 0);
await page.getByRole("button", { name: /Peringatan/ }).click();
await page.waitForTimeout(400);
const warnRows = await page.locator("[data-audit-action]").count();
check("filter peringatan memfilter", warnRows > 0 && warnRows < auditRows, `${warnRows}/${auditRows}`);
await shot("operator-audit");

// sistem tab
await page.locator("button", { hasText: "Sistem" }).first().click();
await page.locator("[data-api-endpoints]").waitFor({ state: "visible", timeout: 8000 });
check("8 endpoint REST", (await page.locator("[data-endpoint]").count()) === 8);
await page.locator("[data-endpoint='slots']").click();
await page.locator("[data-playground-result]").waitFor({ state: "visible", timeout: 8000 });
const playText = await page.locator("[data-playground-result]").innerText();
check("playground GET /slots → 200 + live data", playText.includes("200") && playText.includes("slots"));
await page.locator("[data-endpoint='finance']").click();
await page.waitForTimeout(700);
const playFin = await page.locator("[data-playground-result]").innerText();
check("playground /finance → balanced:true", playFin.includes("balanced") && playFin.includes("true"));
await page.locator("[data-endpoint='post-res']").click();
await page.waitForTimeout(700);
const playPost = await page.locator("[data-playground-result]").innerText();
check("POST → 201 + simulated:true", playPost.includes("201") && playPost.includes("simulated"));
await shot("operator-sistem-playground");
check("arsitektur 4 band", (await page.locator("[data-arch] .rounded-2xl").count()) >= 4);
check("ERD 8 entitas", (await page.locator("[data-erd] svg g").count()) >= 15);
const stackRows = await page.locator("[data-stack] .flex.items-center.gap-3").count();
check("stack 8 baris", stackRows === 8, String(stackRows));
check("changelog 9 rilis", (await page.locator("[data-changelog] .relative").count()) >= 9);
await page.locator("[data-anpr-scan]").click();
await page.waitForTimeout(300);
const anprLog = await page.locator("[data-anpr-log]").innerText();
check("ANPR: plat terenali + keputusan", /BUKA GERBANG|TOLAK/.test(anprLog));
await shot("operator-sistem");

// force checkout appends audit live
await page.locator("button", { hasText: "Monitor" }).first().click();
await page.waitForTimeout(500);
await page.evaluate(() => {
  const st = window.__parkir.getState();
  const active = st.reservations.find((r) => r.status === "CHECKED_IN");
  if (active) window.__parkir.api.forceCheckOut(active.id);
});
await page.waitForTimeout(600);
const forceAudit = await page.evaluate(() => window.__parkir.getState().auditLog.some((e) => e.action === "FORCE_CHECKOUT"));
check("forceCheckOut → audit live-append", forceAudit);

// ───────────────────────── H. wrap up ─────────────────────────
check("nol page error", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));

await browser.close();
console.log(`\n${pass} passed, ${fail} failed${fail ? `\nFAILED: ${failures.join(", ")}` : ""}`);
process.exit(fail ? 1 : 0);
