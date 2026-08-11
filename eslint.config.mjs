import { defineConfig, globalIgnores } from "eslint/config";
import nextTypeScript from "eslint-config-next/typescript";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([".next/**", "coverage/**", "dist/**"]),
  // The Vite storefront is retained only as a migration source until Task 4.
  // New App Router modules keep the full Next.js Core Web Vitals rule set.
  {
    files: ["src/app/App.tsx", "src/features/**/*.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
