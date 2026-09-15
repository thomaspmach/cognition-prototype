import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolCatalog } from "@/components/workspace/tool-catalog";

describe("tool catalog", () => {
  it("keeps accessible search and cards without a visible catalog heading or count badge", () => {
    render(<ToolCatalog />);
    expect(screen.getByRole("region", { name: "Internal tools" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Find a tool" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Internal tools" })).not.toBeInTheDocument();
    expect(screen.queryByText("3", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("3 tools shown");
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
  });

  it("exposes only the KYC foundation as a destination and explains previews", () => {
    render(<ToolCatalog />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/tools/kyc");
    for (const name of ["Refunds Dashboard", "Feature Flag Admin"]) {
      const card = screen.getByRole("article", { name });
      expect(within(card).getByText("Preview only")).toBeVisible();
      expect(within(card).getByText(/Not implemented/)).toBeVisible();
      expect(within(card).queryByRole("link")).not.toBeInTheDocument();
    }
  });

  it("filters by responsible team and announces the result count", () => {
    render(<ToolCatalog />);
    fireEvent.change(screen.getByRole("textbox", { name: "Find a tool" }), {
      target: { value: "Engineering" },
    });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("article", { name: "Feature Flag Admin" })).toBeVisible();
    expect(screen.getByText("1 tools shown")).toHaveAttribute("role", "status");
  });

  it("recovers from an empty search", () => {
    render(<ToolCatalog />);
    fireEvent.change(screen.getByRole("textbox", { name: "Find a tool" }), {
      target: { value: "no such tool" },
    });
    expect(screen.getByText("No matching tools")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });
});
