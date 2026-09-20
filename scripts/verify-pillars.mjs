import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.getByText("Mahasiswa BINUS", { exact: false }).first().click();
await page.locator("button", { hasText: "Cari Slot" }).first().waitFor({ timeout: 15000 });
await page.locator("button", { hasText: "Cari Slot" }).first().click();
await page.locator("[data-map-el='ramp-l2']").first().waitFor({ state: "attached", timeout: 8000 });
await page.locator("button", { hasText: "Peta lengkap" }).first().click();
await page.waitForTimeout(600);
const info = await page.evaluate(() => {
  // the building layout: rows are the flex containers inside the map
  const ramp = document.querySelector("[data-map-el='ramp-l2']");
  const rampRow = ramp.closest("div.flex");
  const map = ramp.closest(".map-tint");
  // find the two big row containers: they are children of the inner width div
  const widthDiv = ramp.closest("div[style*='max-content']");
  const rows = [...widthDiv.children].filter((c) => c.tagName === "DIV");
  const describe = (row) => {
    const out = [];
    const walk = (el) => {
      for (const child of el.children) {
        const label = child.getAttribute("aria-label") || child.textContent?.slice(0, 12) || "";
        const isSlot = child.tagName === "BUTTON" && child.getAttribute("aria-label")?.startsWith("Slot");
        const w = Math.round(child.getBoundingClientRect().width);
        if (isSlot) out.push(`S:${child.getAttribute("aria-label").split("—")[0].replace("Slot ", "")}(${w})`);
        else if (/lift/i.test(label) || /wc/i.test(child.textContent || "")) out.push(`${(child.textContent || "").trim().slice(0, 8)}(${w})`);
        else if (child.children.length === 0) out.push `${""}`;
      }
    };
    // simpler: query direct slot buttons + facility tiles in DOM order
    const seq = [];
    const all = row.querySelectorAll("button[aria-label^='Slot'], [aria-label], span, div");
    // use elementFromPoint alternative: iterate over all descendants that are "leaf visual boxes"
    const slots = [...row.querySelectorAll("button[aria-label^='Slot']")];
    const lift = [...row.querySelectorAll("div")].filter((d) => /LIFT/i.test(d.textContent || "") && d.textContent.length < 12);
    const wc = [...row.querySelectorAll("div")].filter((d) => /^WC$/i.test((d.textContent || "").trim()));
    const gate = [...row.querySelectorAll("span")].filter((s) => /MASUK|KELUAR/i.test(s.textContent || ""));
    return {
      slots: slots.map((s) => s.getAttribute("aria-label").split("—")[0].replace("Slot ", "")),
      lift: lift.length, wc: wc.length, gates: gate.map((g) => g.textContent.trim()),
    };
  };
  const topWall = rows[0];
  const rowA = rows[1], lane = rows[2], rowBEl = rows[3], bottomWall = rows[4];
  // count visual pillar-ish elements in each row (direct flex children chains)
  const pillarCount = (row) => {
    let n = 0;
    for (const grp of row.querySelectorAll("div")) {
      const cs = getComputedStyle(grp);
      if (grp.children.length === 0 && parseFloat(cs.width) <= 8 && parseFloat(cs.height) >= 30) n++;
    }
    return n;
  };
  return {
    rowA: describe(rowA), rowB: describe(rowBEl),
    pillarsA: pillarCount(rowA), pillarsB: pillarCount(rowBEl),
    rampW: Math.round(ramp.getBoundingClientRect().width),
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
