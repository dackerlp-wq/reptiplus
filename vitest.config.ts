import { defineConfig } from "vitest/config";
import path from "node:path";

/** Jednotkové testy čistých výpočtů (DPH, slevy, doprava zdarma, statistiky, poukazy). `npm test`. */
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Moduly označené `server-only` jdou v testech importovat (stub bez efektu).
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
});
