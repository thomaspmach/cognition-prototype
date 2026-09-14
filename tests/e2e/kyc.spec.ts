import { expect, test } from "@playwright/test";

for (const query of ["", "?case", "?case="]) {
  test(`missing or empty case parameter keeps the queue usable: ${query || "(absent)"}`, async ({ page }) => {
    await page.goto(`/tools/kyc${query}`);
    await expect(page.getByText("12 cases shown", { exact: true })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Open KYC-0002" }).click();
    const panel = page.getByRole("dialog", { name: "KYC-0002" });
    await expect(panel.getByText("customer2@example.test", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
  });
}

test.describe("Reviewer workflow", () => {
  test.use({ storageState: ".data/e2e/alex.json" });

  test("assign, reassign and decide with nonexclusive ownership; refresh preserves history", async ({ page }) => {
    await page.goto("/tools/kyc");
    await page.getByRole("button", { name: "Open KYC-0001" }).click();
    const panel = page.getByRole("dialog", { name: "KYC-0001" });
    await panel.getByLabel("Assign to").selectOption("reviewer-alex");
    await panel.getByRole("button", { name: "Assign", exact: true }).click();
    await expect(panel.getByText("Unassigned → Alex Chen")).toBeVisible();
    await panel.getByLabel("Assign to").selectOption("reviewer-sam");
    await panel.getByRole("button", { name: "Reassign", exact: true }).click();
    await expect(panel.getByText("Alex Chen → Sam Rivera")).toBeVisible();
    await panel.getByLabel("Reason (optional)").fill("Synthetic review complete.");
    await panel.getByRole("button", { name: "Save decision" }).click();
    await expect(panel.getByText("Pending → Approved")).toBeVisible();
    await page.reload();
    await expect(panel.getByText("This case is approved and read-only.")).toBeVisible();
    await expect(panel.getByText("Pending → Approved")).toBeVisible();
    await expect(panel.getByRole("listitem")).toHaveCount(3);
    await expect(panel.getByRole("button", { name: /assign|save decision/i })).toHaveCount(0);
    await expect(panel.getByRole("combobox", { name: "Decision", exact: true })).toHaveCount(0);
    await page.screenshot({ path: ".data/e2e/history.png", fullPage: true });
  });

  test("reject requires a nonblank reason and persists the supplied reason", async ({ page }) => {
    await page.goto("/tools/kyc?case=KYC-0003");
    const panel = page.getByRole("dialog", { name: "KYC-0003" });
    await panel.getByRole("combobox", { name: "Decision", exact: true }).selectOption("rejected");
    await panel.getByLabel("Reason (required)").fill("   ");
    await panel.getByRole("button", { name: "Save decision" }).click();
    await expect(panel.getByRole("alert")).toHaveText(/Enter a reason for rejection/);
    await panel.getByLabel("Reason (required)").fill("Synthetic information is incomplete.");
    await panel.getByRole("button", { name: "Save decision" }).click();
    await expect(panel.getByText("Pending → Rejected")).toBeVisible();
    await page.reload();
    await expect(panel.getByText("This case is rejected and read-only.")).toBeVisible();
    await expect(panel.getByRole("listitem")).toContainText("Synthetic information is incomplete.");
  });

  test("escalation remains actionable and may be resolved", async ({ page }) => {
    await page.goto("/tools/kyc?case=KYC-0006");
    const panel = page.getByRole("dialog", { name: "KYC-0006" });
    await panel.getByRole("combobox", { name: "Decision", exact: true }).selectOption("escalated");
    await panel.getByRole("button", { name: "Save decision" }).click();
    await expect(panel.getByText("Pending → Escalated")).toBeVisible();
    await expect(panel.getByRole("combobox", { name: "Decision", exact: true }).locator("option")).toHaveCount(2);
    await panel.getByRole("button", { name: "Save decision" }).click();
    await expect(panel.getByText("Escalated → Approved")).toBeVisible();
  });
});

test("Viewer filters and reads; country is visible but disabled as a filter", async ({ page }) => {
  await page.goto("/tools/kyc");
  await expect(page.getByRole("combobox", { name: "Country", exact: true })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Country" })).toBeVisible();
  await page.getByRole("textbox", { name: "Search customers" }).fill("not-a-customer");
  await expect(page.getByRole("heading", { name: "No matching cases" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("textbox", { name: "Search customers" }).fill("customer2@example.test");
  await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("pending");
  await page.getByRole("combobox", { name: "Assignee", exact: true }).selectOption("reviewer-alex");
  await expect(page.getByText("1 cases shown", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open KYC-0002" }).click();
  const panel = page.getByRole("dialog");
  await expect(panel.getByText("Viewer access is read-only.", { exact: false })).toBeVisible();
  await expect(panel.getByRole("button", { name: /assign|save decision/i })).toHaveCount(0);
  await page.screenshot({ path: ".data/e2e/detail.png", fullPage: true });
});

test("queue and detail request failures can be retried", async ({ page }) => {
  await page.route("**/api/kyc/cases?*", (route) => route.fulfill({
    status: 500, json: { error: "Queue unavailable for this test." },
  }));
  await page.goto("/tools/kyc");
  await expect(page.getByRole("region", { name: "Onboarding queue" }).getByRole("alert")).toContainText("Queue unavailable");
  await page.unroute("**/api/kyc/cases?*");
  await page.getByRole("button", { name: "Refresh queue" }).click();
  await expect(page.getByRole("button", { name: "Open KYC-0002" })).toBeVisible();
  await page.route("**/api/kyc/cases/KYC-0002", (route) => route.fulfill({
    status: 403, json: { error: "Access denied for this test." },
  }));
  await page.getByRole("button", { name: "Open KYC-0002" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Access denied");
  await page.unroute("**/api/kyc/cases/KYC-0002");
  await page.getByRole("button", { name: "Reload details" }).click();
  await expect(page.getByText("Viewer access is read-only.", { exact: false })).toBeVisible();
});
