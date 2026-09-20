import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.getByText("Mahasiswa BINUS", { exact: false }).first().click();
await page.locator("button", { hasText: "Cari Slot" }).first().waitFor({ timeout: 15000 });
await page.locator("button", { hasText: "Cari Slot" }).first().click();
await page.locator("[data-map-el='ramp-l2']").first().waitFor({ state: "attached", timeout: 8000 });
await page.locator("button", { hasText: "Peta lengkap" }).first().click();
await page.waitForTimeout(700);
const ok = await page.evaluate(() => {
  // find the overflow-x container that is actually visible inside the overlay
  const cands = [...document.querySelectorAll(".overflow-x-auto")];
  const vis = cands.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 50 && r.height > 50 && el.scrollWidth > el.clientWidth + 100;
  });
  if (!vis.length) return "none found: " + cands.map(c => `${c.scrollWidth}/${c.clientWidth}`).join(",");
  vis.forEach((el) => (el.scrollLeft = el.scrollWidth));
  return "scrolled " + vis.length + ", final=" + vis.map((el) => el.scrollLeft + "/" + el.scrollWidth).join(",");
});
console.log(ok);
await page.waitForTimeout(700);
await page.screenshot({ path: "scripts/shots/now-map-right-dark.png" });
await browser.close();
