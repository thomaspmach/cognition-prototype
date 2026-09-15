import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "@/app/error";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

beforeEach(() => navigation.refresh.mockClear());

describe("page failure recovery", () => {
  it("shows accessible recovery feedback without exposing the exception", () => {
    render(<ErrorPage error={new Error("synthetic-private-session-detail")} reset={vi.fn()} />);
    expect(screen.getByRole("main")).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: "Unable to load the workspace" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Please try again. If the problem continues, contact Engineering.");
    expect(screen.queryByText(/synthetic-private-session-detail/)).not.toBeInTheDocument();
  });

  it("refreshes server data and resets the boundary on retry", () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error("Unavailable")} reset={reset} />);
    const retry = screen.getByRole("button", { name: "Try again" });
    retry.focus();
    expect(retry).toHaveFocus();
    fireEvent.click(retry);
    expect(navigation.refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
