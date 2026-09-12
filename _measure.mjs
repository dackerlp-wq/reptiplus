import { chromium } from "@playwright/test";
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const [name, w] of [["d1366", 1366], ["t1024", 1024], ["t768", 768], ["m390", 390]]) {
  const page = await browser.newPage({ viewport: { width: w, height: 800 }, locale: "cs-CZ" });
  await page.goto("http://localhost:3000/cs/produkty", { waitUntil: "networkidle" });
  const before = await page.evaluate(() => ({ nav: document.querySelector("nav")?.getBoundingClientRect().height, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth }));
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => ({ nav: document.querySelector("nav")?.getBoundingClientRect().height, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, compact: !!document.querySelector("[data-compact]") }));
  console.log(name, "before", JSON.stringify(before), "after", JSON.stringify(after));
  await page.screenshot({ path: `${out}/hdr-${name}.png`, clip: { x: 0, y: 0, width: w, height: 120 } });
  await page.close();
}
await browser.close();
