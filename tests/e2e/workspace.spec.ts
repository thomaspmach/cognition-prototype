import { expect, test } from "@playwright/test";

for (const actor of [
  { identity: "viewer", name: "Morgan Lee", role: "viewer" },
  { identity: "alex", name: "Alex Chen", role: "reviewer" },
  { identity: "sam", name: "Sam Rivera", role: "reviewer" },
]) {
  test.describe(`sidebar identity for ${actor.identity}`, () => {
    test.use({ storageState: `.data/e2e/${actor.identity}.json` });

    test("shows the signed-in account in the footer across navigation and sidebar modes", async ({ page }) => {
      await page.goto("/");
      const footer = page.locator('[data-slot="sidebar-footer"]');
      const header = page.getByRole("banner");
      await expect(footer.getByText(actor.name, { exact: true })).toBeVisible();
      await expect(footer.getByText(actor.role, { exact: true })).toBeVisible();
      await expect(header.getByText(actor.name, { exact: true })).toHaveCount(0);
      await expect(header.getByText(actor.role, { exact: true })).toHaveCount(0);
      await expect(header.getByRole("button", { name: "Sign out", exact: true })).toHaveCount(0);
      const accountMenu = footer.getByRole("button", { name: "Account menu", exact: true });
      await expect(accountMenu).toBeVisible();
      await expect(header.getByRole("button", { name: "Account menu", exact: true })).toHaveCount(0);
      await expect(page.getByRole("menuitem", { name: "Sign out", exact: true })).toHaveCount(0);
      const nameBounds = await footer.getByText(actor.name, { exact: true }).boundingBox();
      const menuBounds = await accountMenu.boundingBox();
      expect(nameBounds).not.toBeNull();
      expect(menuBounds).not.toBeNull();
      expect(menuBounds!.x).toBeGreaterThan(nameBounds!.x + nameBounds!.width);
      await expect(page.getByText("Synthetic workspace", { exact: true })).toHaveCount(0);
      await expect(page.getByText("Internal tools · Prototype", { exact: true })).toHaveCount(0);

      await page.getByRole("navigation", { name: "Tools", exact: true }).getByRole("link", { name: "KYC Case Review" }).click();
      await expect(page).toHaveURL("/tools/kyc");
      await expect(footer.getByText(actor.name, { exact: true })).toBeVisible();
      await expect(footer.getByText(actor.role, { exact: true })).toBeVisible();
      await expect(page.getByRole("main").getByText(/^(Reviewer|Viewer · Read-only)$/)).toHaveCount(0);
      const toggle = page.getByRole("button", { name: "Toggle sidebar" });
      await toggle.click();
      await expect(footer.getByText(actor.name, { exact: true })).not.toBeVisible();
      await expect(footer).toHaveAttribute("aria-label", `Signed in as ${actor.name}, ${actor.role}`);
      await expect(footer).toHaveAttribute("title", `${actor.name} · ${actor.role}`);
      await expect(accountMenu).toBeInViewport();
      await expect(accountMenu).toHaveAccessibleName("Account menu");
      expect(await footer.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await toggle.click();
      await expect(footer.getByText(actor.name, { exact: true })).toBeVisible();

      await page.setViewportSize({ width: 390, height: 844 });
      await toggle.click();
      const mobileFooter = page.getByRole("dialog", { name: "Workspace navigation" }).locator('[data-slot="sidebar-footer"]');
      await expect(mobileFooter.getByText(actor.name, { exact: true })).toBeVisible();
      await expect(mobileFooter.getByText(actor.role, { exact: true })).toBeVisible();
      await expect(mobileFooter.getByRole("button", { name: "Account menu", exact: true })).toBeInViewport();
      expect(await mobileFooter.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    });
  });
}

for (const mode of ["expanded", "collapsed", "mobile"] as const) {
  test(`account menu opens above the footer and supports dismissal in ${mode} mode`, async ({ page }) => {
    if (mode === "mobile") await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    if (mode !== "expanded") await page.getByRole("button", { name: "Toggle sidebar" }).click();
    if (mode === "mobile") {
      await expect(page.getByRole("dialog", { name: "Workspace navigation" }).getByRole("link", { name: "Overview", exact: true })).toBeFocused();
    }
    const trigger = page.getByRole("button", { name: "Account menu", exact: true });
    const menu = page.getByRole("menu", { name: "Account actions", exact: true });
    const signOut = page.getByRole("menuitem", { name: "Sign out", exact: true });
    await expect(menu).toHaveCount(0);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.focus();
    await trigger.press("ArrowDown");
    await expect(menu).toBeInViewport();
    await expect(signOut).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const menuBounds = await menu.boundingBox();
    const triggerBounds = await trigger.boundingBox();
    expect(menuBounds).not.toBeNull();
    expect(triggerBounds).not.toBeNull();
    expect(menuBounds!.y + menuBounds!.height).toBeLessThan(triggerBounds!.y);
    await signOut.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    if (mode === "mobile") await expect(page.getByRole("dialog", { name: "Workspace navigation" })).toBeVisible();
    await trigger.click();
    await expect(menu).toBeVisible();
    await trigger.click();
    await expect(menu).toHaveCount(0);
    await trigger.press("ArrowUp");
    await expect(signOut).toBeFocused();
    await signOut.press("Shift+Tab");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(signOut).toBeFocused();
    await signOut.press("Tab");
    await expect(menu).toHaveCount(0);
    await trigger.click();
    await expect(menu).toBeVisible();
    await page.setViewportSize({ width: mode === "mobile" ? 400 : 1300, height: 900 });
    await expect(menu).toHaveCount(0);
    await trigger.click();
    await expect(menu).toBeVisible();
    await page.getByRole("navigation", { name: "Tools", exact: true }).getByRole("link", { name: "Overview", exact: true }).click();
    await expect(page.locator("[popover]:popover-open")).toHaveCount(0);
  });
}

test("shared navigation persists between Overview and KYC", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  await expect(page.getByText("Your workspace", { exact: true })).toHaveCount(0);
  await expect(page.getByText("One place for the tools behind your operations.", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("heading", { name: "Internal tools" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Find a tool" })).toBeVisible();
  await expect(page.getByText("Review onboarding cases with your team.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Local demonstration · All data is synthetic.", { exact: true })).toHaveCount(0);
  const nav = page.getByRole("navigation", { name: "Tools", exact: true });
  await expect(nav.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "collapsed");
  await nav.getByRole("link", { name: "KYC Case Review" }).click();
  await expect(page).toHaveURL("/tools/kyc");
  await expect(page.getByRole("heading", { name: "KYC Case Review", level: 1 })).toBeVisible();
  await expect(page.getByText("Compliance", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Review onboarding cases, assign reviewers and record decisions.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Viewer · Read-only", { exact: true })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "KYC Case Review" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "collapsed");
  await expect(page.getByRole("region", { name: "Onboarding queue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Onboarding queue" })).toHaveCount(0);
  await expect(page.getByText("Oldest submissions first · Synthetic data", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Refresh queue" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open KYC-0001" })).toBeVisible();
  await expect(page.getByRole("button", { name: /assign|approve|reject|escalate/i })).toHaveCount(0);
  await nav.getByRole("link", { name: "Overview" }).click();
  await expect(page).toHaveURL("/");
});

test("catalog search aligns left with the Overview title", async ({ page }) => {
  await page.goto("/");
  const title = await page.getByRole("heading", { name: "Overview", level: 1 }).boundingBox();
  const search = await page.getByRole("textbox", { name: "Find a tool" }).locator("..").boundingBox();
  expect(title).not.toBeNull();
  expect(search).not.toBeNull();
  expect(search!.x).toBeCloseTo(title!.x, 0);
  expect(search!.y).toBeGreaterThan(title!.y + title!.height);
  expect(search!.width).toBe(256);
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
    await expect(page.getByText("404", { exact: true })).toHaveCount(0);
    await expect(page.getByText("This destination is not part of the workspace.", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Return to Overview" })).toBeVisible();
  }
});

test("every case row cell opens the same drawer and restores focus", async ({ page }) => {
  await page.goto("/tools/kyc");
  const action = page.getByRole("button", { name: "Open KYC-0002", exact: true });
  await expect(action).toBeVisible();
  const cellColor = await action.locator("..").evaluate((element) => getComputedStyle(element).color);
  await expect(action).toHaveCSS("color", cellColor);
  await action.hover();
  await expect(action).toHaveCSS("text-decoration-line", "none");
  const row = page.getByRole("row").filter({ has: action });
  await expect(row).toHaveCSS("cursor", "pointer");
  const dialog = page.getByRole("dialog", { name: "KYC-0002", exact: true });
  const email = row.getByText("customer2@example.test", { exact: true });
  await email.evaluate((element) => {
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await email.dispatchEvent("click");
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("customer2@example.test");
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  const cells = row.getByRole("cell");
  await expect(cells).toHaveCount(6);
  for (let index = 0; index < await cells.count(); index++) {
    await cells.nth(index).click({ position: { x: 3, y: 3 } });
    await expect(page).toHaveURL("/tools/kyc?case=KYC-0002");
    await expect(dialog.getByText("customer2@example.test", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(action).toBeFocused();
  }
  await row.locator("[data-badge-icon]").click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  const lowerAction = page.getByRole("button", { name: "Open KYC-0008", exact: true });
  await lowerAction.scrollIntoViewIfNeeded();
  await page.getByRole("row").filter({ has: lowerAction }).getByText("customer8@example.test", { exact: true }).click();
  await expect(page.getByRole("dialog", { name: "KYC-0008", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(lowerAction).toBeFocused();
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

test("KYC columns fill the table and keep headers aligned across viewport sizes", async ({ page }) => {
  await page.goto("/tools/kyc");
  await expect(page.getByRole("button", { name: "Open KYC-0002" })).toBeVisible();
  const table = page.getByRole("table");
  const scroller = table.locator("..");
  for (const width of [1280, 1600, 1920, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const headers = await table.getByRole("columnheader").evaluateAll((elements) =>
      elements.map((element) => ({ x: element.getBoundingClientRect().x, width: element.getBoundingClientRect().width })),
    );
    const cells = await table.locator('tbody tr:not([aria-hidden])').first().locator('td:not([aria-hidden])').evaluateAll((elements) =>
      elements.map((element) => ({ x: element.getBoundingClientRect().x, width: element.getBoundingClientRect().width })),
    );
    const tableWidth = await table.evaluate((element) => element.getBoundingClientRect().width);
    expect(headers).toHaveLength(6);
    expect(cells).toHaveLength(6);
    expect(headers.reduce((sum, column) => sum + column.width, 0)).toBeCloseTo(tableWidth, 0);
    for (const [index, column] of headers.entries()) {
      expect(column.width).toBeGreaterThanOrEqual(89);
      expect(cells[index].x).toBeCloseTo(column.x, 0);
      expect(cells[index].width).toBeCloseTo(column.width, 0);
    }
    const submittedIndex = await table.getByRole("columnheader", { name: "Submitted (UTC)", exact: true })
      .evaluate((element) => (element as HTMLTableCellElement).cellIndex);
    const submittedCell = table.locator('tbody tr:not([aria-hidden])').first().locator("td").nth(submittedIndex);
    expect(await submittedCell.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await table.locator('thead th[aria-hidden]').evaluate((element) => element.getBoundingClientRect().width)).toBeLessThan(1);
    expect(await scroller.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(width < 1280);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`status badges scroll beneath the sticky header with ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/tools/kyc");
    const table = page.getByRole("table");
    const scroller = table.locator("..");
    const row = table.getByRole("row").filter({ has: page.getByRole("button", { name: "Open KYC-0002" }) });
    const label = row.locator("[data-badge-label]");
    const icon = row.locator("[data-badge-icon]");
    await expect(label).toHaveText("Pending");
    await expect(label).toHaveCSS("opacity", "1");
    const header = table.getByRole("columnheader", { name: "Status", exact: true });
    const headerBounds = await header.boundingBox();
    const labelBounds = await label.boundingBox();
    expect(headerBounds).not.toBeNull();
    expect(labelBounds).not.toBeNull();
    const scrollTop = Math.round(labelBounds!.y + labelBounds!.height / 2 - headerBounds!.y - headerBounds!.height / 2);
    await scroller.evaluate((element, top) => { element.scrollTop = top; }, scrollTop);
    await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBe(scrollTop);
    expect((await header.boundingBox())!.y).toBeCloseTo(headerBounds!.y, 0);
    for (const part of [label, icon]) {
      const bounds = await part.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.y + bounds!.height / 2).toBeGreaterThan(headerBounds!.y);
      expect(bounds!.y + bounds!.height / 2).toBeLessThan(headerBounds!.y + headerBounds!.height);
      await expect.poll(() => part.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return top?.closest("th")?.textContent?.trim();
      })).toBe("Status");
    }
    await scroller.evaluate((element) => { element.scrollTop = 0; });
    await expect.poll(() => label.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return top?.closest("td")?.contains(element);
    })).toBe(true);
  });
}

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
