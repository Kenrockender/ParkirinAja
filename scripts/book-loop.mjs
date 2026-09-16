/**
 * Tier-shift live proof: book N slots one by one as the customer and print the
 * demand banner after each booking — expect LOW (15K) for the first ~10, then
 * NORMAL (20K) once occupancy reaches 40% (12/30).
 * Drives the running dev app via CDP through agent-browser eval is not loopable,
 * so this uses Playwright directly (agent-browser's bundled chromium).
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const N = 13;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto(BASE, { waitUntil: "networkidle" });

// sign in as student (robust: wait for the demo account button, click, wait for home)
const studentBtn = page.getByText("Mahasiswa BINUS", { exact: false }).first();
await studentBtn.waitFor({ state: "visible", timeout: 15000 });
await studentBtn.click();
await page.locator("button", { hasText: "Cari Slot" }).first().waitFor({ state: "visible", timeout: 15000 });
await page.waitForTimeout(500);

const results = [];
for (let i = 0; i < N; i++) {
  // open search results — wait properly for the home tab to be back
  const searchBtn = page.locator("button", { hasText: "Cari Slot" }).first();
  await searchBtn.waitFor({ state: "visible", timeout: 8000 });
  await searchBtn.click();
  await page
    .locator("button[aria-label*='— AVAILABLE']")
    .first()
    .waitFor({ state: "visible", timeout: 8000 });

  // pick the first AVAILABLE slot (SlotBay buttons carry aria-label "Slot A-01 — AVAILABLE")
  const chips = page.locator("button[aria-label*='— AVAILABLE']");
  const cnt = await chips.count();
  if (cnt === 0) {
    results.push({ i, error: "no free slot chips" });
    break;
  }
  await chips.first().click();
  await page.locator("button", { hasText: "Bayar & Booking" }).first().waitFor({ state: "visible", timeout: 8000 });

  // read the banner + fee before paying
  const banner = await page.locator("body").innerText();
  const tierNow = /Low demand/i.test(banner) ? "LOW" : /High demand/i.test(banner) ? "HIGH" : "NORMAL";
  if (tierNow !== "LOW" && !results.some((r) => r.tier === tierNow && r.shot)) {
    await page.screenshot({ path: `scripts/shots/v11-13-${tierNow.toLowerCase()}-banner.png` });
  }

  // pay
  const pay = page.locator("button", { hasText: "Bayar & Booking" }).first();
  await pay.click();
  await page.waitForTimeout(1600);

  const after = await page.locator("body").innerText();
  const feeMatch = banner.match(/Bayar & Booking\s*·\s*(Rp[\d.]+)/);
  results.push({
    i: i + 1,
    tier: /Low demand/i.test(banner) ? "LOW" : /High demand/i.test(banner) ? "HIGH" : "NORMAL",
    fee: feeMatch ? feeMatch[1] : null,
    ok: after.includes("PARKING PASS"),
  });

  // back to home tabs (ticket back lands on History tab → switch to Beranda)
  const back = page.locator("button[aria-label*='Kembali']").first();
  await back.waitFor({ state: "visible", timeout: 8000 });
  await back.click();
  await page.waitForTimeout(600);
  const homeTab = page.locator("nav button", { hasText: "Beranda" }).first();
  await homeTab.waitFor({ state: "visible", timeout: 8000 });
  await homeTab.click();
  await page.waitForTimeout(600);
}

await page.screenshot({ path: "scripts/shots/v11-12-tier-shift-final.png" });
console.log(JSON.stringify(results, null, 1));
await browser.close();
