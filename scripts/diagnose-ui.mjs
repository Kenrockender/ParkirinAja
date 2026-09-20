/**
 * diagnose-ui.mjs — capture current state of the 3 reported issues:
 *  1. bottom navbar frost state (computed styles + screenshot)
 *  2. Kemanggisan parking layout (map view full + home compact)
 *  3. profile picture / avatar UI
 * Run: bun scripts/diagnose-ui.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });

async function shot(name) {
  await page.screenshot({ path: `scripts/shots/diag-${name}.png`, fullPage: false });
}

// sign in as student
await page.goto(BASE, { waitUntil: "networkidle" });
await page.getByText("Mahasiswa BINUS", { exact: false }).first().waitFor({ state: "visible", timeout: 20000 });
await page.getByText("Mahasiswa BINUS", { exact: false }).first().click();
await page.locator("button", { hasText: "Cari Slot" }).first().waitFor({ state: "visible", timeout: 15000 });
await page.waitForTimeout(800);

// ── 1. bottom navbar computed styles ──
const navInfo = await page.evaluate(() => {
  const nav = document.querySelector("nav[aria-label='Main navigation']");
  if (!nav) return { found: false };
  const pill = nav.querySelector(".glass");
  const cs = pill ? getComputedStyle(pill) : null;
  const ncs = getComputedStyle(nav);
  // walk ancestors to find anything that breaks backdrop-filter
  const ancestors = [];
  let el = nav.parentElement;
  while (el && ancestors.length < 12) {
    const s = getComputedStyle(el);
    if (s.transform !== "none" || s.filter !== "none" || s.backdropFilter !== "none" ||
        s.opacity !== "1" || s.willChange !== "auto" || s.contain !== "none" ||
        s.isolation === "isolate" || s.mixBlendMode !== "normal") {
      ancestors.push({ tag: el.tagName, cls: String(el.className).slice(0, 90),
        transform: s.transform, filter: s.filter, backdropFilter: s.backdropFilter,
        opacity: s.opacity, willChange: s.willChange, contain: s.contain,
        isolation: s.isolation, mixBlendMode: s.mixBlendMode });
    }
    el = el.parentElement;
  }
  return {
    found: true,
    navClass: nav.className,
    pillClass: pill ? pill.className : null,
    pillBg: cs?.backgroundColor,
    pillBackdropFilter: cs?.backdropFilter,
    pillBorder: cs?.border,
    navBackdropFilter: ncs.backdropFilter,
    breakerAncestors: ancestors,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    htmlBg: getComputedStyle(document.documentElement).backgroundColor,
  };
});
console.log("NAV:", JSON.stringify(navInfo, null, 2));

// scroll a bit so content passes under the navbar, then screenshot
await page.evaluate(() => window.scrollTo(0, 260));
await page.waitForTimeout(400);
await shot("navbar-scrolled");

// ── 2. Kemanggisan parking map: open full map view ──
// home compact map first
await shot("home-compact-map");

// find the map open button (home has a way to open full map)
const mapBtns = await page.locator("button", { hasText: /Peta|Lihat Peta|Buka Peta/i }).count();
console.log("map buttons found:", mapBtns);
// try the campus/hero map card
const heroBtn = page.locator("button", { hasText: "Ketersediaan sekarang" }).first();
if (await heroBtn.count()) {
  const card = heroBtn.locator("xpath=ancestor::div[.//button][1]");
}
// click whatever opens MapView — try known label
try {
  await page.getByText("Lihat Peta Live", { exact: false }).first().click({ timeout: 3000 });
} catch {
  try {
    await page.getByRole("button", { name: /peta/i }).first().click({ timeout: 3000 });
  } catch {
    console.log("no explicit map button found — trying home map card click");
  }
}
await page.waitForTimeout(900);
await shot("map-view");

// ── 3. profile view ──
await page.locator("nav button", { hasText: "Profil" }).first().click();
await page.waitForTimeout(700);
await shot("profile");

// avatar picker state
const avatarInfo = await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")].filter((b) =>
    /avatar|foto|ganti/i.test(b.textContent || "") || b.querySelector("img"));
  return btns.slice(0, 12).map((b) => ({
    text: (b.textContent || "").trim().slice(0, 40),
    aria: b.getAttribute("aria-label"),
    dataAttrs: [...b.attributes].filter((a) => a.name.startsWith("data-")).map((a) => `${a.name}=${a.value}`).join(" "),
  }));
});
console.log("AVATAR BTNS:", JSON.stringify(avatarInfo, null, 2));

await browser.close();
console.log("done — shots saved to scripts/shots/diag-*.png");
