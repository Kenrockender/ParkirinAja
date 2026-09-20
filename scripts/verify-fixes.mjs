/** verify-fixes.mjs — verify the 3 fixes: navbar frost, map note, avatar chip + upload flow */
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));
let pass = 0, fail = 0;
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ` — ${detail}` : ""}`); }
  else { fail++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
};

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.getByText("Mahasiswa BINUS", { exact: false }).first().click();
await page.locator("button", { hasText: "Cari Slot" }).first().waitFor({ timeout: 15000 });
await page.waitForTimeout(700);

// ── 1. navbar frost ──
console.log("1. Navbar frost");
const frost = await page.evaluate(() => {
  const pill = document.querySelector("nav[aria-label='Main navigation'] .glass");
  const cs = getComputedStyle(pill);
  return { bf: cs.backdropFilter, bg: cs.backgroundColor };
});
check("pill backdrop-filter aktif", frost.bf.includes("blur"), frost.bf);
check("pill bg semi-transparan", /rgba\(.*,\s*0\./.test(frost.bg) || /,0\./.test(frost.bg), frost.bg);
// scroll content under the navbar & screenshot
await page.locator("button", { hasText: "Cari Slot" }).first().click();
await page.locator("[data-map-el='ramp-l2']").first().waitFor({ state: "attached", timeout: 8000 });
await page.waitForTimeout(500);
await page.evaluate(() => window.scrollTo(0, 420));
await page.waitForTimeout(400);
await page.screenshot({ path: "scripts/shots/fix-navbar-frost.png" });

// ── 2. map note contrast (light mode) ──
console.log("2. Map note light-mode contrast");
await page.locator("button[aria-label='Tampilan']").click();
await page.waitForTimeout(600);
// note only renders on the FULL map (not compact) — open it
await page.locator("button", { hasText: "Peta lengkap" }).first().click();
await page.waitForTimeout(800);
const noteInfo = await page.evaluate(() => {
  const p = [...document.querySelectorAll("p")].find((el) => /masuk lewat|enter/.test(el.textContent || "") && el.closest(".map-tint"));
  if (!p) return null;
  const cs = getComputedStyle(p);
  return { color: cs.color, text: p.textContent.slice(0, 50) };
});
check("note peta ditemukan", !!noteInfo, noteInfo?.text || "");
if (noteInfo) {
  // slate-500 = rgb(100,116,139) — contrast on white ≈ 4.6:1 (was slate-400 ≈ 2.8:1)
  const m = noteInfo.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m) {
    const [r, g, b] = [+m[1], +m[2], +m[3]];
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const contrast = (1.05) / (lum + 0.05);
    check(`kontras note light ≥ 4.0:1`, contrast >= 4.0, `${contrast.toFixed(2)}:1 (${noteInfo.color})`);
  }
}
await page.screenshot({ path: "scripts/shots/fix-map-note-light.png" });
// close map, back to dark
await page.locator("button[aria-label='Tutup']").first().click();
await page.waitForTimeout(400);
await page.locator("button[aria-label='Tampilan']").click();
await page.waitForTimeout(500);

// ── 3. avatar: persistent chip + upload flow ──
console.log("3. Avatar camera chip + upload");
await page.locator("nav button", { hasText: "Profil" }).first().click();
await page.waitForTimeout(700);
check("camera chip persisten tampil", (await page.locator("[data-avatar-cam]").count()) === 1);
check("link teks 'Ganti foto profil' tampil", (await page.getByText("Ganti foto profil", { exact: false }).count()) >= 1);
await page.screenshot({ path: "scripts/shots/fix-profile-chip.png" });

// upload flow
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);
const input = page.locator("input[type=file][accept='image/png,image/jpeg,image/webp']");
await input.setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: tinyPng });
await page.waitForTimeout(900);
const avatarState = await page.evaluate(() => window.__parkir.getState().user.avatar);
check("avatar ter-upload", typeof avatarState === "string" && avatarState.startsWith("data:image/png"));
check("gambar dirender", (await page.locator("[data-avatar-img]").count()) > 0);
check("tombol hapus muncul", (await page.locator("[data-avatar-remove]").count()) === 1);
await page.screenshot({ path: "scripts/shots/fix-profile-uploaded.png" });
const audited = await page.evaluate(() => window.__parkir.getState().auditLog.some((e) => e.action === "PROFILE_UPDATE"));
check("audit PROFILE_UPDATE", audited);
// remove again
await page.locator("[data-avatar-remove]").click();
await page.waitForTimeout(400);
const cleared = await page.evaluate(() => window.__parkir.getState().user.avatar);
check("avatar dihapus kembali", cleared == null);

check("nol page error", pageErrors.length === 0, pageErrors.slice(0, 2).join(" | "));
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
