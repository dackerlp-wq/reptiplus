import { defineConfig, devices } from "@playwright/test";

/**
 * E2E průchod obchodem (homepage → produkt → košík → pokladna). `npm run test:e2e`.
 * Bez PLAYWRIGHT_BASE_URL spustí `next dev` na portu 3000 (potřebuje .env.local se Supabase klíči);
 * s PLAYWRIGHT_BASE_URL=https://reptiplus.cz běží proti nasazené verzi (objednávku nikdy neodesílá).
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    locale: "cs-CZ",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: "npm run dev", url: "http://localhost:3000/cs", reuseExistingServer: true, timeout: 120_000 },
});
