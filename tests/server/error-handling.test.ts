import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireActor, RequestError } from "@/lib/server/access";
import { sqlite } from "@/lib/server/database";
import { errorResponse } from "@/lib/server/http";
import { requirePageActor } from "@/lib/server/page-access";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/server/access", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/server/access")>(), requireActor: vi.fn(),
}));

const privateDetail = "synthetic-private-cookie; customer@example.test; /private/database.sqlite";
const requestHeaders = new Headers({ cookie: privateDetail });

beforeEach(() => {
  vi.mocked(requireActor).mockReset();
  vi.mocked(headers).mockResolvedValue(requestHeaders);
  vi.mocked(redirect).mockReset().mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => sqlite.close());

describe("safe API diagnostics", () => {
  it.each([400, 401, 403, 404, 409])("preserves expected %s errors without incident logging", async (status) => {
    const response = errorResponse(new RequestError(status, "Expected failure."), "kyc.case.read");
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: "Expected failure." });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("preserves validation and malformed JSON responses", async () => {
    const validation = z.string().safeParse(123);
    expect(validation.success).toBe(false);
    expect(errorResponse(validation.error, "kyc.case.write").status).toBe(400);
    const response = errorResponse(new SyntaxError(privateDetail), "kyc.case.write");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Provide a valid JSON request." });
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each([
    new Error(privateDetail, { cause: new Error(privateDetail) }),
    new RequestError(503, privateDetail),
    { message: privateDetail, name: privateDetail, code: privateDetail },
  ])("correlates unexpected errors without exposing exception contents", async (error) => {
    const response = errorResponse(error, "kyc.case.read");
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body.errorId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.error).toContain(`Reference: ${body.errorId}`);
    expect(response.headers.get("x-request-id")).toBe(body.errorId);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0][0])).toEqual({
      event: "unexpected_server_error", errorId: body.errorId, operation: "kyc.case.read",
      errorType: error instanceof Error ? "Error" : "UnknownError",
    });
    expect(JSON.stringify(body)).not.toContain(privateDetail);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(privateDetail);
  });

  it("records only allowlisted database codes and error types", () => {
    const error = Object.assign(new Error(privateDetail), { name: "SqliteError", code: "SQLITE_BUSY" });
    errorResponse(error, "kyc.queue.read");
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0][0])).toMatchObject({
      operation: "kyc.queue.read", errorType: "SqliteError", databaseCode: "SQLITE_BUSY",
    });
    errorResponse(Object.assign(error, { name: privateDetail, code: privateDetail }), "kyc.queue.read");
    expect(JSON.parse(vi.mocked(console.error).mock.calls[1][0])).toEqual({
      event: "unexpected_server_error", errorId: expect.any(String),
      operation: "kyc.queue.read", errorType: "UnknownError",
    });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(privateDetail);
  });
});

describe("page access failure boundary", () => {
  it("returns the verified actor and forwards request headers", async () => {
    const actor = { id: "viewer", name: "Viewer", role: "viewer" as const };
    vi.mocked(requireActor).mockResolvedValue(actor);
    expect(await requirePageActor()).toEqual(actor);
    expect(requireActor).toHaveBeenCalledWith(requestHeaders);
    expect(redirect).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("redirects a missing session to login without logging an incident", async () => {
    vi.mocked(requireActor).mockRejectedValue(new RequestError(401, "Sign in."));
    await expect(requirePageActor()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(console.error).not.toHaveBeenCalled();
  });

  it("preserves denied access instead of treating it as a missing session", async () => {
    const error = new RequestError(403, "Access denied.");
    vi.mocked(requireActor).mockRejectedValue(error);
    await expect(requirePageActor()).rejects.toBe(error);
    expect(redirect).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("logs an unavailable session lookup and rethrows a safe error for the page boundary", async () => {
    vi.mocked(requireActor).mockRejectedValue(new Error(privateDetail));
    await expect(requirePageActor()).rejects.toThrow(/^Workspace access could not be verified\. Reference: [0-9a-f-]{36}$/);
    expect(redirect).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0][0])).toEqual({
      event: "unexpected_server_error", errorId: expect.any(String),
      operation: "workspace.session.read", errorType: "Error",
    });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(privateDetail);
  });
});
