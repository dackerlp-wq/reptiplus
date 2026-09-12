import { chromium } from "@playwright/test";
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const [name, vp] of [["desktop", { width: 1366, height: 800 }], ["mobile", { width: 390, height: 800 }]]) {
  const page = await browser.newPage({ viewport: vp, locale: "cs-CZ" });
  await page.goto("http://localhost:3000/cs/produkty", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${out}/${name}-top.png`, clip: { x: 0, y: 0, width: vp.width, height: 360 } });
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${name}-scrolled.png`, clip: { x: 0, y: 0, width: vp.width, height: 200 } });
  const compact = await page.locator("[data-compact]").count();
  console.log(name, "compact attr:", compact);
  await page.close();
}
await browser.close();
