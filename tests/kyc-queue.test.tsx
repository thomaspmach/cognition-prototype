import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TableProps } from "@/components/motion/table";
import { KycQueue } from "@/components/kyc/kyc-queue";
import { kycRequest } from "@/lib/kyc/client";
import type { CaseRecord, QueueData } from "@/lib/kyc/model";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/kyc/client", () => ({ kycRequest: vi.fn() }));
vi.mock("@/lib/kyc/presentation", () => ({
  queuePresentation: {
    enabledFilters: ["country"],
    columnOrder: ["submittedAt", "assigneeName", "status", "country", "customerName", "id"],
    pageSize: 10,
  },
}));
vi.mock("@/components/shared/detail-panel", () => ({ DetailPanel: () => null }));
vi.mock("@/components/shared/action-button", () => ({
  ActionButton: ({ children, ...props }: { children: ReactNode; onClick: () => void; disabled: boolean }) => <button {...props}>{children}</button>,
}));
vi.mock("@/components/shared/queue-table", () => ({
  QueueTable: ({ data, columns, loading }: TableProps<CaseRecord>) => loading ? null : (
    <table>
      <thead><tr>{columns.map((column) => <th key={column.key} style={{ width: column.width }}>{column.header}</th>)}</tr></thead>
      <tbody>{data.map((record) => <tr key={record.id}>{columns.map((column) => (
        <td key={column.key}>{column.cell ? column.cell(record) : String(record[column.key as keyof CaseRecord])}</td>
      ))}</tr>)}</tbody>
    </table>
  ),
}));

const cases: CaseRecord[] = Array.from({ length: 23 }, (_, index) => ({
  id: `KYC-${index + 1}`, customerName: `Customer ${index + 1}`, customerEmail: `customer${index + 1}@example.test`,
  country: "GB", submittedAt: "2026-01-01T00:00:00Z", status: "pending",
  assigneeId: null, assigneeName: null, reviewReason: null, riskScore: 10, version: 1,
}));
const data: QueueData = { cases, countries: ["GB"], reviewers: [] };

beforeEach(() => {
  vi.mocked(kycRequest).mockReset().mockResolvedValue(data);
  navigation.replace.mockClear();
  window.getSelection()?.removeAllRanges();
});

describe("configured queue composition", () => {
  it("opens each row from any cell and keeps the action tied to its case after pagination", async () => {
    render(<KycQueue role="viewer" />);
    const action = await screen.findByRole("button", { name: "Open KYC-1" });
    const row = action.closest("tr")!;
    for (const cell of within(row).getAllByRole("cell")) {
      navigation.replace.mockClear();
      fireEvent.click(cell);
      expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/tools/kyc?case=KYC-1", { scroll: false });
      expect(action).toHaveFocus();
    }
    navigation.replace.mockClear();
    fireEvent.click(within(row).getByText("Pending"));
    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/tools/kyc?case=KYC-1", { scroll: false });
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    navigation.replace.mockClear();
    fireEvent.click(screen.getByText("customer11@example.test"));
    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/tools/kyc?case=KYC-11", { scroll: false });
  });

  it("ignores headers and does not duplicate direct Case button actions", async () => {
    render(<KycQueue role="viewer" />);
    const action = await screen.findByRole("button", { name: "Open KYC-1" });
    fireEvent.click(screen.getByRole("columnheader", { name: "Customer" }));
    expect(navigation.replace).not.toHaveBeenCalled();
    fireEvent.click(action);
    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/tools/kyc?case=KYC-1", { scroll: false });
  });

  it("keeps selected row text available for copying without opening details", async () => {
    render(<KycQueue role="viewer" />);
    const email = await screen.findByText("customer1@example.test");
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(email);
    selection.addRange(range);
    expect(selection.toString()).toBe("customer1@example.test");
    fireEvent.click(email);
    expect(navigation.replace).not.toHaveBeenCalled();
    selection.removeAllRanges();
    fireEvent.click(email);
    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/tools/kyc?case=KYC-1", { scroll: false });
  });

  it("announces loaded counts without displaying them and keeps loading feedback visible", async () => {
    render(<KycQueue role="viewer" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Loading cases…");
    expect(status).not.toHaveClass("sr-only");
    await screen.findByText("23 matching cases");
    expect(status).toHaveClass("sr-only");
  });

  it("keeps queue failure feedback visible", async () => {
    vi.mocked(kycRequest).mockRejectedValueOnce(new Error("Connection failed"));
    render(<KycQueue role="viewer" />);
    await screen.findByText("Queue unavailable");
    expect(screen.getByRole("status")).not.toHaveClass("sr-only");
    expect(screen.getByRole("alert")).toHaveTextContent("Connection failed");
    expect(screen.getByRole("button", { name: "Refresh queue" })).toBeEnabled();
  });

  it("reorders all columns, pages every record and retains identity, status and opening actions", async () => {
    render(<KycQueue role="viewer" />);
    await screen.findByText("23 matching cases");
    expect(screen.queryByText("Select a case to view its details and chronological history. Risk scores never make decisions.")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Onboarding queue" })).not.toBeInTheDocument();
    expect(screen.queryByText("Oldest submissions first · Synthetic data")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Onboarding queue" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Refresh queue" })).toBeEnabled();
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent))
      .toEqual(["Submitted (UTC)", "Assignee", "Status", "Country", "Customer", "Case"]);
    expect(screen.getAllByRole("columnheader").map((header) => header.style.width))
      .toEqual(["18%", "16%", "15%", "10%", "28%", "13%"]);
    expect(screen.getByText("customer1@example.test")).toBeVisible();
    expect(screen.getAllByText("Pending")).toHaveLength(10);
    expect(screen.getAllByRole("button", { name: /^Open KYC-/ })).toHaveLength(10);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByRole("button", { name: "Open KYC-11" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getAllByRole("button", { name: /^Open KYC-/ })).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Open KYC-23" }));
    expect(navigation.replace).toHaveBeenCalledWith("/tools/kyc?case=KYC-23", { scroll: false });
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(screen.getByRole("button", { name: "Open KYC-11" })).toBeVisible();
  });

  it("resets pagination on filtering and handles an empty result without an invalid page", async () => {
    render(<KycQueue role="viewer" />);
    await screen.findByText("23 matching cases");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    vi.mocked(kycRequest).mockResolvedValue({ ...data, cases: [] });
    fireEvent.change(screen.getByRole("combobox", { name: "Country" }), { target: { value: "GB" } });
    await screen.findByText("0 matching cases");
    expect(screen.getByText("Page 1 of 1 · 10 per page")).toBeVisible();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    await waitFor(() => expect(kycRequest).toHaveBeenLastCalledWith("/api/kyc/cases?country=GB", expect.any(Object)));
  });
});
