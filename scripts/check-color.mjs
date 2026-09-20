import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.getByText("Mahasiswa BINUS", { exact: false }).first().click();
await page.locator("button", { hasText: "Cari Slot" }).first().waitFor({ timeout: 15000 });
await page.locator("button[aria-label='Tampilan']").click();
await page.waitForTimeout(500);
await page.locator("button", { hasText: "Cari Slot" }).first().click();
await page.locator("button", { hasText: "Peta lengkap" }).first().click();
await page.waitForTimeout(700);
const info = await page.evaluate(() => {
  const p = [...document.querySelectorAll("p")].find((el) => /masuk lewat/.test(el.textContent || "") && el.closest(".map-tint"));
  // resolve to rgb via canvas-free trick: create temp span with same color
  const cs = getComputedStyle(p);
  const probe = document.createElement("span");
  probe.style.color = cs.color;
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color; // browsers normalize to rgb()/rgba()
  probe.remove();
  return { raw: cs.color, rgb };
});
console.log(JSON.stringify(info));
await browser.close();
