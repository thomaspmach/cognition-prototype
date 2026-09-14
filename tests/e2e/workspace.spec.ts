import { expect, test } from "@playwright/test";

test("shared navigation persists between Overview and KYC", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Tools", exact: true });
  await expect(nav.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "collapsed");
  await nav.getByRole("link", { name: "KYC Case Review" }).click();
  await expect(page).toHaveURL("/tools/kyc");
  await expect(nav.getByRole("link", { name: "KYC Case Review" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "collapsed");
  await expect(page.getByRole("heading", { name: "Onboarding queue" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open KYC-0001" })).toBeVisible();
  await expect(page.getByRole("button", { name: /assign|approve|reject|escalate/i })).toHaveCount(0);
  await nav.getByRole("link", { name: "Overview" }).click();
  await expect(page).toHaveURL("/");
});

test("preview entries cannot navigate, including guessed direct URLs", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Tools", exact: true });
  for (const name of ["Refunds Dashboard", "Feature Flag Admin"]) {
    await expect(nav.getByRole("button", { name: `${name} — Preview only` })).toBeDisabled();
    await expect(page.getByRole("article", { name }).getByText(/Not implemented/)).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveCount(0);
  }
  for (const path of ["/tools/refunds", "/tools/feature-flags"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  }
});

test("detail panel supports keyboard focus, containment, Escape and return", async ({ page }) => {
  await page.goto("/tools/kyc");
  const trigger = page.getByRole("button", { name: "Open KYC-0001" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "KYC-0001" });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole("button", { name: "Close detail panel" });
  await expect(close).toBeFocused();
  const reload = dialog.getByRole("button", { name: "Reload details" });
  await expect(reload).toBeEnabled();
  await page.keyboard.press("Tab");
  await expect(reload).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(reload).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("laptop layout contains table overflow and respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.getByRole("link", { name: "Open KYC Case Review" }).click();
  await expect(page.getByRole("button", { name: "Refresh queue" })).toBeInViewport();
  await page.setViewportSize({ width: 1024, height: 768 });
  const tableScroller = page.locator("table").locator("..");
  expect(await tableScroller.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("link", { name: "Overview", exact: true })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Refresh queue" })).toBeInViewport();
});

test("mobile navigation opens, closes and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Toggle sidebar" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Workspace navigation" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("link", { name: "KYC Case Review" }).click();
  await expect(page).toHaveURL("/tools/kyc");
  await expect(dialog).not.toBeVisible();
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
