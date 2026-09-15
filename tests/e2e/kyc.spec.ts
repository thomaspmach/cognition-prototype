import { expect, test } from "@playwright/test";
import { queuePresentation } from "../../lib/kyc/presentation";
import type { QueueData } from "../../lib/kyc/model";

for (const query of ["", "?case", "?case="]) {
  test(`missing or empty case parameter keeps the queue usable: ${query || "(absent)"}`, async ({ page }) => {
    await page.goto(`/tools/kyc${query}`);
    await expect(page.getByRole("region", { name: "Onboarding queue" }).getByRole("status")).toHaveText("12 matching cases");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Open KYC-0002" }).click();
    const panel = page.getByRole("dialog", { name: "KYC-0002" });
    await expect(panel.getByText("customer2@example.test", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
  });
}

test("result counts stay screen-reader-only while clear filters remains available", async ({ page }) => {
  await page.goto("/tools/kyc");
  const queue = page.getByRole("region", { name: "Onboarding queue" });
  const status = queue.getByRole("status");
  await expect(status).toHaveText("12 matching cases");
  await expect(status).toHaveClass(/sr-only/);
  const search = page.getByRole("textbox", { name: "Search customers" });
  await search.fill("not-a-customer");
  await expect(status).toHaveText("0 matching cases");
  await expect(status).toHaveClass(/sr-only/);
  const clear = page.getByRole("button", { name: "Clear filters" });
  await expect(clear).toBeVisible();
  const clearBounds = await clear.boundingBox();
  const queueBounds = await queue.boundingBox();
  expect(clearBounds).not.toBeNull();
  expect(queueBounds).not.toBeNull();
  expect(clearBounds!.x + clearBounds!.width).toBeCloseTo(queueBounds!.x + queueBounds!.width, 0);
  await clear.click();
  await expect(search).toHaveValue("");
  await expect(status).toHaveText("12 matching cases");
  await expect(status).toHaveClass(/sr-only/);
  await expect(clear).toHaveCount(0);
});

test("refresh sits to the right of the filters and wraps without overflow", async ({ page }) => {
  await page.goto("/tools/kyc");
  await expect(page.getByRole("region", { name: "Onboarding queue" }).getByRole("status")).toHaveText("12 matching cases");
  const search = page.getByRole("textbox", { name: "Search customers" });
  const selects = page.getByRole("combobox");
  const lastInput = await selects.count() ? selects.last() : search;
  const refresh = page.getByRole("button", { name: "Refresh queue", exact: true });
  for (const width of [1280, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    const fieldBounds = await search.locator("..").boundingBox();
    const lastBounds = await lastInput.boundingBox();
    const buttonBounds = await refresh.boundingBox();
    expect(fieldBounds).not.toBeNull();
    expect(lastBounds).not.toBeNull();
    expect(buttonBounds).not.toBeNull();
    expect(buttonBounds!.x).toBeGreaterThan(lastBounds!.x + lastBounds!.width);
    expect(buttonBounds!.y).toBeCloseTo(fieldBounds!.y, 0);
    expect(buttonBounds!.height).toBeCloseTo(fieldBounds!.height, 0);
    const filterBounds = await selects.evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right };
    }));
    for (let index = 1; index < filterBounds.length; index++) {
      expect(filterBounds[index].left - filterBounds[index - 1].right).toBeCloseTo(8, 0);
    }
  }
  await lastInput.focus();
  await page.keyboard.press("Tab");
  await expect(refresh).toBeFocused();
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(search).toBeInViewport();
    await expect(refresh).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("filter chevrons have a consistent right inset and do not intercept clicks", async ({ page }) => {
  await page.goto("/tools/kyc");
  await expect(page.getByRole("region", { name: "Onboarding queue" }).getByRole("status")).toHaveText("12 matching cases");
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const filter of queuePresentation.enabledFilters) {
      const select = page.getByRole("combobox", { name: new RegExp(`^${filter}$`, "i") });
      const chevron = select.locator("..").locator("svg");
      await expect(chevron).toBeVisible();
      await expect(select).toHaveCSS("appearance", "none");
      await expect(select).toHaveCSS("padding-right", "40px");
      await expect(chevron).toHaveCSS("pointer-events", "none");
      const selectBounds = await select.boundingBox();
      const iconBounds = await chevron.boundingBox();
      expect(selectBounds).not.toBeNull();
      expect(iconBounds).not.toBeNull();
      expect(selectBounds!.x + selectBounds!.width - iconBounds!.x - iconBounds!.width).toBeCloseTo(12, 0);
      expect(iconBounds!.y + iconBounds!.height / 2).toBeCloseTo(selectBounds!.y + selectBounds!.height / 2, 0);
      expect(await chevron.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.tagName;
      })).toBe("SELECT");
    }
  }
});

test("filter placeholders match search and selected values remain readable", async ({ page }) => {
  await page.goto("/tools/kyc");
  await expect(page.getByRole("region", { name: "Onboarding queue" }).getByRole("status")).toHaveText("12 matching cases");
  const search = page.getByRole("textbox", { name: "Search customers" });
  const placeholderColor = await search.evaluate((element) => getComputedStyle(element, "::placeholder").color);
  const textColor = await search.evaluate((element) => getComputedStyle(element).color);
  const values = { status: "pending", assignee: "unassigned", country: "GB" };
  for (const filter of queuePresentation.enabledFilters) {
    const select = page.getByRole("combobox", { name: new RegExp(`^${filter}$`, "i") });
    await expect(select).toHaveCSS("color", placeholderColor);
    await select.selectOption(values[filter]);
    await expect(select).toHaveCSS("color", textColor);
    await select.selectOption("");
    await expect(select).toHaveCSS("color", placeholderColor);
  }
});

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

test("Viewer uses configured filters and reads; country remains visible", async ({ page }) => {
  await page.goto("/tools/kyc");
  for (const filter of ["status", "assignee", "country"] as const) {
    await expect(page.getByRole("combobox", { name: new RegExp(`^${filter}$`, "i") }))
      .toHaveCount(queuePresentation.enabledFilters.includes(filter) ? 1 : 0);
  }
  await expect(page.getByRole("columnheader", { name: "Country" })).toBeVisible();
  await page.getByRole("textbox", { name: "Search customers" }).fill("not-a-customer");
  await expect(page.getByRole("heading", { name: "No matching cases" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("textbox", { name: "Search customers" }).fill("customer2@example.test");
  if (queuePresentation.enabledFilters.includes("status")) {
    await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("pending");
  }
  if (queuePresentation.enabledFilters.includes("assignee")) {
    await page.getByRole("combobox", { name: "Assignee", exact: true }).selectOption("reviewer-alex");
  }
  await expect(page.getByRole("region", { name: "Onboarding queue" }).getByRole("status")).toHaveText("1 matching cases");
  await page.getByRole("button", { name: "Open KYC-0002" }).click();
  const panel = page.getByRole("dialog");
  await expect(panel.getByText("Viewer access is read-only.", { exact: false })).toBeVisible();
  await expect(panel.getByRole("button", { name: /assign|save decision/i })).toHaveCount(0);
  await page.screenshot({ path: ".data/e2e/detail.png", fullPage: true });
});

test("country selection composes with other filters and can be cleared and reapplied", async ({ page }) => {
  test.skip(!queuePresentation.enabledFilters.includes("country"), "Country filter is not configured.");
  const expectCases = async (ids: string[]) => {
    await expect(page.getByRole("button", { name: /^Open KYC-/ })).toHaveCount(ids.length);
    for (const id of ids) {
      await expect(page.getByRole("button", { name: `Open ${id}`, exact: true })).toBeVisible();
    }
  };
  await page.goto("/tools/kyc");
  const country = page.getByRole("combobox", { name: "Country", exact: true });
  await country.selectOption("GB");
  await expectCases(["KYC-0001", "KYC-0006"]);
  await country.selectOption("US");
  await expectCases(["KYC-0002", "KYC-0008"]);
  if (queuePresentation.enabledFilters.includes("status")) {
    await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("pending");
    await expectCases(["KYC-0002", "KYC-0008"]);
  }
  if (queuePresentation.enabledFilters.includes("assignee")) {
    await page.getByRole("combobox", { name: "Assignee", exact: true }).selectOption("reviewer-sam");
    await expect(page.getByRole("heading", { name: "No matching cases" })).toBeVisible();
    await expectCases([]);
    await page.getByRole("combobox", { name: "Assignee", exact: true }).selectOption("reviewer-alex");
    await expectCases(["KYC-0002", "KYC-0008"]);
  }
  await page.getByRole("textbox", { name: "Search customers" }).fill("Drew");
  await expectCases(["KYC-0008"]);
  await country.selectOption("GB");
  await expect(page.getByRole("heading", { name: "No matching cases" })).toBeVisible();
  await expectCases([]);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("region", { name: "Onboarding queue" }).getByRole("status")).toHaveText("12 matching cases");
  await expect(page.getByRole("button", { name: /^Open KYC-/ })).toHaveCount(Math.min(12, queuePresentation.pageSize));
  await expect(country).toHaveValue("");
  await country.selectOption("US");
  await expectCases(["KYC-0002", "KYC-0008"]);
  await page.reload();
  await expect(country).toHaveValue("");
  await country.selectOption("US");
  await expectCases(["KYC-0002", "KYC-0008"]);
});

test("configured page size reaches the last record and preserves case navigation", async ({ page }) => {
  await page.route("**/api/kyc/cases?*", async (route) => {
    const response = await route.fetch();
    const data: QueueData = await response.json();
    const records = Array.from({ length: queuePresentation.pageSize + 1 }, (_, index) => ({
      ...data.cases[0], id: `PAGE-${index}`, customerName: `Page customer ${index}`,
    }));
    records[records.length - 1] = data.cases.find((record) => record.id === "KYC-0002")!;
    await route.fulfill({ json: { ...data, cases: records } });
  });
  await page.goto("/tools/kyc");
  const pages = page.getByRole("navigation", { name: "Queue pages" });
  await expect(pages).toContainText(`Page 1 of 2 · ${queuePresentation.pageSize} per page`);
  await expect(pages.getByRole("button", { name: "Previous page" })).toBeDisabled();
  await pages.getByRole("button", { name: "Next page" }).click();
  await expect(pages).toContainText("Page 2 of 2");
  await expect(pages.getByRole("button", { name: "Next page" })).toBeDisabled();
  await page.screenshot({ path: ".data/e2e/pagination.png", fullPage: true });
  await page.getByRole("button", { name: "Open KYC-0002" }).click();
  await expect(page.getByRole("dialog").getByText("customer2@example.test", { exact: true })).toBeVisible();
});

test("queue and detail request failures can be retried", async ({ page }) => {
  const errorId = "018fa167-2b68-4e44-a5d6-476621c7b81d";
  await page.route("**/api/kyc/cases?*", (route) => route.fulfill({
    status: 500, json: { error: `Queue unavailable for this test. Reference: ${errorId}`, errorId },
  }));
  await page.goto("/tools/kyc");
  const feedback = page.getByRole("region", { name: "Onboarding queue" }).getByRole("alert");
  await expect(feedback).toContainText("Queue unavailable");
  await expect(feedback).toContainText(`Reference: ${errorId}`);
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
