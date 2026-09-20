/** probe-backdrop.mjs — verify backdrop-filter reality in the running app */
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.getByText("Mahasiswa BINUS", { exact: false }).first().click();
await page.locator("button", { hasText: "Cari Slot" }).first().waitFor({ timeout: 15000 });
await page.waitForTimeout(600);

const res = await page.evaluate(() => {
  const out = {};
  const pill = document.querySelector("nav .glass");
  const header = document.querySelector("header");
  const csP = getComputedStyle(pill);
  const csH = getComputedStyle(header);
  out.pill = {
    cls: pill.className.slice(0, 60),
    backdropFilter: csP.backdropFilter,
    webkitBackdropFilter: csP.webkitBackdropFilter,
    background: csP.backgroundColor,
  };
  out.header = {
    cls: header.className.slice(0, 80),
    backdropFilter: csH.backdropFilter,
    webkitBackdropFilter: csH.webkitBackdropFilter,
  };
  // Does the pill have a Tailwind backdrop-blur class? (no) — check any element with .backdrop-blur-xl
  const bxl = document.querySelector(".backdrop-blur-xl");
  out.someBackdropBlurXl = bxl
    ? {
        tag: bxl.tagName,
        backdropFilter: getComputedStyle(bxl).backdropFilter,
      }
    : "none in DOM";
  // count matched CSS rules for .glass
  const rules = [];
  for (const sheet of document.styleSheets) {
    let rs;
    try { rs = sheet.cssRules; } catch { continue; }
    const walk = (list) => {
      for (const r of list) {
        if (r.cssRules) walk(r.cssRules);
        if (r.selectorText && r.selectorText.includes(".glass")) rules.push(r.cssText.slice(0, 160));
      }
    };
    walk(rs);
  }
  out.glassRules = rules;
  return out;
});
console.log(JSON.stringify(res, null, 2));
await browser.close();
