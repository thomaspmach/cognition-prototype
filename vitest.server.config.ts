import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/server/**/*.test.ts"],
    env: {
      SQLITE_PATH: ":memory:",
      BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
      BETTER_AUTH_URL: "http://localhost:3000",
    },
  },
});
