import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.getByText("Mahasiswa BINUS", { exact: false }).first().click();
await page.locator("button", { hasText: "Cari Slot" }).first().waitFor({ timeout: 15000 });
await page.locator("button[aria-label='Tampilan']").click(); // → light
await page.waitForTimeout(700);
await page.locator("button", { hasText: "Cari Slot" }).first().click();
await page.locator("[data-map-el='ramp-l2']").first().waitFor({ state: "attached", timeout: 8000 });
await page.waitForTimeout(500);
await page.screenshot({ path: "scripts/shots/now-home-compact-light.png" });
await page.locator("button", { hasText: "Peta lengkap" }).first().click();
await page.waitForTimeout(800);
await page.screenshot({ path: "scripts/shots/now-map-full-light.png" });
await browser.close();
console.log("ok");
