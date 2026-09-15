import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "@/components/shared/page-header";

describe("page header", () => {
  it("renders a title without empty supporting text", () => {
    render(<PageHeader title="Overview" />);
    expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    expect(screen.queryAllByRole("paragraph")).toHaveLength(0);
  });

  it("preserves operational badges and actions alongside the title", () => {
    render(
      <PageHeader title="KYC Case Review">
        <span>Reviewer</span>
        <button type="button">Refresh queue</button>
      </PageHeader>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "KYC Case Review" })).toBeVisible();
    expect(screen.queryAllByRole("paragraph")).toHaveLength(0);
    expect(screen.getByText("Reviewer")).toBeVisible();
    expect(screen.getByRole("button", { name: "Refresh queue" })).toBeVisible();
  });
});
