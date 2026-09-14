import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["components/motion/**/*.tsx"],
    rules: {
      // Unmodified beUI source uses DOM measurement and shared mutable refs.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/incompatible-library": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    files: ["components/motion/button/stateful.tsx"],
    rules: {
      // beUI remeasures its label after every render, bailing on equal width.
      "react-hooks/exhaustive-deps": "off",
    },
  },
  globalIgnores([".next/**", "coverage/**", "playwright-report/**", "test-results/**", "next-env.d.ts"]),
]);
