import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** ESLint 9 flat config — `npm run lint`. Build na Vercelu lint nespouští, je to ruční kontrola před pushem. */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "Claude outputs/**", "wordpress-plugin/**", "scripts/**"]),
]);
