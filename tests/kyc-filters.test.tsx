import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { emptyFilters, QueueFilters } from "@/components/kyc/queue-filters";
import { queuePresentation } from "@/lib/kyc/presentation";

describe("country filter presentation", () => {
  it("keeps country filtering disabled in the initial presentation", () => {
    render(<QueueFilters values={emptyFilters} onChange={vi.fn()} reviewers={[]} countries={["GB"]} />);
    expect(queuePresentation.enabledFilters).toEqual(["status", "assignee"]);
    expect(screen.queryByRole("combobox", { name: "Country" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });

  it("supports enabling and selecting country using the reusable filter component", () => {
    const onChange = vi.fn();
    render(<QueueFilters values={emptyFilters} onChange={onChange} reviewers={[]} countries={["GB", "US"]}
      enabledFilters={["status", "assignee", "country"]} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Country" }), { target: { value: "GB" } });
    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, country: "GB" });
  });
});
