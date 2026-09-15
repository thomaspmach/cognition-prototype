import { expect, test } from "@playwright/test";

test("sidebar hover highlights links without highlighting disabled previews", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Tools", exact: true });
  const kyc = nav.getByRole("link", { name: "KYC Case Review" });
  await kyc.hover();
  await expect(kyc).toHaveCSS("background-color", "rgb(240, 241, 244)");
  await expect(kyc.getByText("Available")).toBeVisible();
  await expect(kyc.getByText("Available")).toHaveCSS("margin-top", "0px");
  await expect(kyc.getByText("Available")).toHaveCSS("line-height", "16px");

  for (const name of ["Refunds Dashboard", "Feature Flag Admin"]) {
    const preview = nav.getByRole("button", { name: `${name} — Preview only` });
    const row = nav.getByRole("listitem").filter({
      has: page.getByRole("button", { name: `${name} — Preview only` }),
    });
    const textColor = await preview.evaluate((element) => getComputedStyle(element).color);
    await row.hover();
    await expect(preview).toBeDisabled();
    await expect.poll(() => row.evaluate((element) =>
      [element, ...element.querySelectorAll("*")]
        .map((child) => getComputedStyle(child).backgroundColor)
        .filter((color) => color !== "rgba(0, 0, 0, 0)" && color !== "transparent"),
    )).toEqual([]);
    await expect(preview).toHaveCSS("color", textColor);
    await expect(preview.getByText("Preview only")).toBeVisible();
    await expect(preview.getByText("Preview only")).toHaveCSS("margin-top", "0px");
    await expect(preview.getByText("Preview only")).toHaveCSS("line-height", "16px");
  }
});
