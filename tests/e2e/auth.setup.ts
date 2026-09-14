import { mkdir } from "node:fs/promises";
import { expect, test as setup } from "@playwright/test";

setup("authenticate synthetic users against a migrated, seeded database", async ({ playwright }) => {
  await mkdir(".data/e2e", { recursive: true });
  for (const identity of ["viewer", "alex", "sam"]) {
    const request = await playwright.request.newContext({ baseURL: "http://127.0.0.1:3100" });
    const response = await request.post("/api/auth/sign-in/email", {
      data: { email: `${identity}@example.test`, password: "Synthetic-demo-2026!" },
    });
    expect(response.status()).toBe(200);
    await request.storageState({ path: `.data/e2e/${identity}.json` });
    await request.dispose();
  }
});
