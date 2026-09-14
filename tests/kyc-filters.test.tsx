import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { emptyFilters, QueueFilters } from "@/components/kyc/queue-filters";
import { queuePresentation } from "@/lib/kyc/presentation";

describe("configured filters", () => {
  it("renders exactly the configured filters and always retains search", () => {
    render(<QueueFilters values={emptyFilters} onChange={vi.fn()} reviewers={[]} countries={["GB"]} />);
    expect(screen.getByRole("textbox", { name: "Search customers" })).toBeVisible();
    expect(screen.queryAllByRole("combobox")).toHaveLength(queuePresentation.enabledFilters.length);
    for (const filter of ["status", "assignee", "country"] as const) {
      expect(Boolean(screen.queryByRole("combobox", { name: new RegExp(`^${filter}$`, "i") })))
        .toBe(queuePresentation.enabledFilters.includes(filter));
    }
  });

  it("keeps search available when all optional filters are disabled", () => {
    render(<QueueFilters values={emptyFilters} onChange={vi.fn()} reviewers={[]} countries={[]} enabledFilters={[]} />);
    expect(screen.getByRole("textbox", { name: "Search customers" })).toBeVisible();
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
  });

  it("supports enabling and selecting country using the reusable filter component", () => {
    const onChange = vi.fn();
    render(<QueueFilters values={emptyFilters} onChange={onChange} reviewers={[]} countries={["GB", "US"]}
      enabledFilters={["status", "assignee", "country"]} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Country" }), { target: { value: "GB" } });
    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, country: "GB" });
  });
});
