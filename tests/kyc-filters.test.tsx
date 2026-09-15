import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { emptyFilters, QueueFilters } from "@/components/kyc/queue-filters";
import { queuePresentation } from "@/lib/kyc/presentation";

describe("configured filters", () => {
  it("uses inset decorative chevrons without changing accessible select controls", () => {
    render(<QueueFilters values={emptyFilters} onChange={vi.fn()} reviewers={[]} countries={["GB"]}
      enabledFilters={["status", "assignee", "country"]} />);
    for (const select of screen.getAllByRole("combobox")) {
      expect(select).toHaveClass("appearance-none", "pr-10");
      const chevron = select.parentElement?.querySelector("svg.lucide-chevron-down");
      expect(chevron).toHaveAttribute("aria-hidden", "true");
      expect(chevron).toHaveClass("pointer-events-none", "right-3", "size-4");
    }
  });

  it("renders an optional action after the filter inputs", () => {
    const onRefresh = vi.fn();
    render(
      <QueueFilters values={emptyFilters} onChange={vi.fn()} reviewers={[]} countries={["GB"]}
        enabledFilters={["status", "assignee", "country"]}>
        <button type="button" onClick={onRefresh}>Refresh queue</button>
      </QueueFilters>,
    );
    const refresh = screen.getByRole("button", { name: "Refresh queue" });
    expect(refresh.parentElement?.lastElementChild).toBe(refresh);
    expect(screen.getByRole("combobox", { name: "Country" }).closest("label")?.nextElementSibling).toBe(refresh);
    fireEvent.click(refresh);
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("keeps accessible labels without showing them above the filters", () => {
    render(<QueueFilters values={emptyFilters} onChange={vi.fn()} reviewers={[]} countries={["GB"]}
      enabledFilters={["status", "assignee", "country"]} />);
    for (const label of ["Search customers", "Status", "Assignee", "Country"]) {
      expect(screen.getByText(label, { exact: true })).toHaveClass("sr-only");
      expect(screen.getByLabelText(label, { exact: true })).toBeVisible();
    }
  });

  it("uses muted placeholders and normal text for selected filter values", () => {
    const props = { onChange: vi.fn(), reviewers: [], countries: ["GB"], enabledFilters: ["status", "assignee", "country"] as const };
    const { rerender } = render(<QueueFilters {...props} values={emptyFilters} />);
    for (const select of screen.getAllByRole("combobox")) {
      expect(select).toHaveClass("text-muted-foreground/60");
    }
    rerender(<QueueFilters {...props} values={{ ...emptyFilters, status: "pending", assignee: "unassigned", country: "GB" }} />);
    for (const select of screen.getAllByRole("combobox")) {
      expect(select).toHaveClass("text-foreground");
      expect(select).not.toHaveClass("text-muted-foreground/60");
    }
    for (const option of screen.getAllByRole("option", { selected: true })) {
      expect(option).toHaveClass("text-foreground");
    }
    rerender(<QueueFilters {...props} values={emptyFilters} />);
    for (const select of screen.getAllByRole("combobox")) {
      expect(select).toHaveClass("text-muted-foreground/60");
    }
  });

  it("shows a decorative search icon and preserves customer search input", () => {
    const onChange = vi.fn();
    render(<QueueFilters values={emptyFilters} onChange={onChange} reviewers={[]} countries={[]} />);
    const search = screen.getByRole("textbox", { name: "Search customers" });
    expect(search.parentElement?.querySelector("svg.lucide-search")).toHaveAttribute("aria-hidden", "true");
    fireEvent.change(search, { target: { value: "customer@example.test" } });
    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, search: "customer@example.test" });
  });

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
