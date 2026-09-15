import { setTimeout as delay } from "node:timers/promises";
import { expect, test, type APIRequestContext } from "@playwright/test";
import type { CaseDetail, QueueData } from "@/lib/kyc/model";

test("direct HTTP enforces permissions, input validation, terminal state and concurrent writes", async ({ playwright, request }) => {
  const baseURL = "http://127.0.0.1:3100";
  const anonymous = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  const alex = await playwright.request.newContext({ baseURL, storageState: ".data/e2e/alex.json" });
  const sam = await playwright.request.newContext({ baseURL, storageState: ".data/e2e/sam.json" });
  const post = (client: APIRequestContext, id: string, data: unknown) =>
    client.post(`/api/kyc/cases/${id}`, { data, headers: { Origin: baseURL } });
  const decision = { action: "decide", status: "approved", version: 0 };
  try {
    expect((await anonymous.get("/api/kyc/cases")).status()).toBe(401);
    expect((await anonymous.get("/api/kyc/cases/KYC-0002")).status()).toBe(401);
    expect((await post(anonymous, "KYC-0002", decision)).status()).toBe(401);
    expect((await post(request, "KYC-0002", { ...decision, actorId: "reviewer-alex", role: "reviewer" })).status()).toBe(403);
    expect((await post(request, "KYC-0002", { action: "assign", assigneeId: "reviewer-sam", version: 0 })).status()).toBe(403);
    const before: CaseDetail = await (await alex.get("/api/kyc/cases/KYC-0002")).json();
    for (const body of [
      { ...decision, actorId: "reviewer-sam" }, { ...decision, role: "reviewer" },
      { ...decision, status: "rejected", reason: "  " },
      { action: "assign", assigneeId: "missing", version: 0 },
      { action: "assign", assigneeId: "viewer", version: 0 },
      { ...decision, status: "pending" },
    ]) expect((await post(alex, "KYC-0002", body)).status()).toBe(400);
    expect(await (await alex.get("/api/kyc/cases/KYC-0002")).json()).toEqual(before);
    expect((await alex.post("/api/kyc/cases/KYC-0002", {
      data: decision, headers: { Origin: "https://untrusted.example" },
    })).status()).toBe(403);
    for (const id of ["KYC-0009", "KYC-0010"]) {
      const terminal: CaseDetail = await (await alex.get(`/api/kyc/cases/${id}`)).json();
      expect((await post(alex, id, { ...decision, version: terminal.case.version })).status()).toBe(409);
      expect((await post(alex, id, { action: "assign", assigneeId: "reviewer-sam", version: terminal.case.version })).status()).toBe(409);
      expect(await (await alex.get(`/api/kyc/cases/${id}`)).json()).toEqual(terminal);
    }
    const race = await Promise.all([
      post(alex, "KYC-0004", decision),
      post(sam, "KYC-0004", { ...decision, status: "rejected", reason: "Another review" }),
    ]);
    expect(race.map((response) => response.status()).sort()).toEqual([200, 409]);
    const persisted: CaseDetail = await (await alex.get("/api/kyc/cases/KYC-0004")).json();
    expect(persisted.events).toHaveLength(1);
    expect(persisted.case.status).toBe(persisted.events[0].toStatus);
    expect((await post(alex, "KYC-0004", decision)).status()).toBe(409);
    const countries: QueueData = await (await request.get("/api/kyc/cases?country=GB")).json();
    expect(countries.cases).toHaveLength(2);
    expect(countries.cases.every((record) => record.country === "GB")).toBe(true);
  } finally {
    await anonymous.dispose();
    await alex.dispose();
    await sam.dispose();
  }
});

test.describe("sign-in boundary", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: { cookies: [], origins: [] } });

  test("protects workspace pages, reports invalid credentials and signs out", async ({ page }) => {
    await page.goto("/tools/kyc");
    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("heading", { name: "Welcome back", level: 1 })).toBeVisible();
    await expect(page.getByText("company / tools", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Sign in to your internal workspace.", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Local demonstration · Synthetic accounts and cases only.", { exact: true })).toBeVisible();
    await page.getByLabel("Email", { exact: true }).fill("viewer@example.test");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    const [attempt] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith("/api/auth/sign-in/email")),
      page.getByRole("button", { name: "Sign in", exact: true }).click(),
    ]);
    if (attempt.status() === 429) {
      await expect(page.getByRole("main").getByRole("alert")).toContainText("Too many sign-in attempts");
      await delay((Number(attempt.headers()["x-retry-after"]) || 10) * 1000 + 100);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
    }
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Sign-in failed");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-demo-2026!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Account menu", exact: true }).click();
    await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL("/login");
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  for (const mode of ["expanded", "collapsed", "mobile"] as const) {
    test(`footer sign-out supports error recovery in ${mode} mode`, async ({ page }) => {
      if (mode === "mobile") await page.setViewportSize({ width: 390, height: 844 });
      const signIn = () => page.request.post("/api/auth/sign-in/email", {
        data: { email: "viewer@example.test", password: "Synthetic-demo-2026!" },
      });
      let response = await signIn();
      if (response.status() === 429) {
        await delay((Number(response.headers()["x-retry-after"]) || 10) * 1000 + 100);
        response = await signIn();
      }
      expect(response.status()).toBe(200);
      await page.goto("/");
      if (mode !== "expanded") await page.getByRole("button", { name: "Toggle sidebar" }).click();
      const footer = page.getByRole("group", { name: "Signed in as Morgan Lee, viewer", exact: true });
      const trigger = footer.getByRole("button", { name: "Account menu", exact: true });
      await expect(trigger).toBeInViewport();
      await page.route("**/api/auth/sign-out", (route) => route.fulfill({
        status: 500, json: { message: "Simulated sign-out failure" },
      }));
      await trigger.click();
      const signOut = page.getByRole("menuitem", { name: "Sign out", exact: true });
      await expect(signOut).toBeInViewport();
      await signOut.click();
      await expect(footer.getByRole("alert")).toHaveText("Sign-out failed. Retry.");
      await expect(footer.getByRole("alert")).toBeInViewport();
      await expect(trigger).toBeEnabled();
      await expect(trigger).toBeFocused();
      expect(await footer.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.unroute("**/api/auth/sign-out");
      await trigger.click();
      await signOut.click();
      await expect(page).toHaveURL("/login");
      await page.goto("/tools/kyc");
      await expect(page).toHaveURL("/login");
    });
  }
});
