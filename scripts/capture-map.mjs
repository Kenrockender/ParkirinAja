/** capture-map.mjs — capture current Kemanggisan map states for comparison */
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.getByText("Mahasiswa BINUS", { exact: false }).first().click();
await page.locator("button", { hasText: "Cari Slot" }).first().waitFor({ timeout: 15000 });
await page.waitForTimeout(800);

// search → results + compact map on home
await page.locator("button", { hasText: "Cari Slot" }).first().click();
await page.locator("[data-map-el='ramp-l2']").first().waitFor({ state: "attached", timeout: 8000 });
await page.waitForTimeout(600);
await page.screenshot({ path: "scripts/shots/now-home-compact-dark.png" });

// full map
await page.locator("button", { hasText: "Peta lengkap" }).first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: "scripts/shots/now-map-full-dark.png" });

// geometry measurements of the building layout
const geo = await page.evaluate(() => {
  const ramp = [...document.querySelectorAll("[data-map-el='ramp-l2']")].map((el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) };
  });
  const slotBtns = [...document.querySelectorAll("button[aria-label^='Slot']")];
  const labels = slotBtns.map((b) => b.getAttribute("aria-label").split("—")[0].trim().replace("Slot ", ""));
  const mapCard = document.querySelector(".map-tint");
  const mr = mapCard ? mapCard.getBoundingClientRect() : null;
  return {
    ramp,
    slotCount: slotBtns.length,
    slotLabels: labels,
    mapCard: mr ? { w: Math.round(mr.width), h: Math.round(mr.height) } : null,
  };
});
console.log("GEO:", JSON.stringify(geo, null, 1));

// light mode toggle
await page.locator("button[aria-label='Tampilan']").click();
await page.waitForTimeout(700);
await page.screenshot({ path: "scripts/shots/now-map-full-light.png" });

await browser.close();
console.log("saved now-*.png");
