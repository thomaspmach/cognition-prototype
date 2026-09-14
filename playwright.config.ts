import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium", dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 },
        storageState: ".data/e2e/viewer.json",
      },
    },
  ],
  webServer: {
    command: "npm run db:migrate && npm run db:seed && npm run start -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: {
      SQLITE_PATH: resolve(".data", `e2e-${randomUUID()}.sqlite`),
      BETTER_AUTH_URL: "http://127.0.0.1:3100",
      BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
    },
  },
});
