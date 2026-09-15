import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as queueGET } from "@/app/api/kyc/cases/route";
import { GET, POST } from "@/app/api/kyc/cases/[id]/route";
import { statuses, type CaseDetail, type QueueData } from "@/lib/kyc/model";
import { auth } from "@/lib/server/auth";
import { db, sqlite } from "@/lib/server/database";
import { account, caseEvents, cases, user } from "@/lib/server/schema";
import { demoPassword, seed } from "@/lib/server/seed";

vi.mock("server-only", () => ({}));

const origin = "http://localhost:3000";
let viewer = "";
let alex = "";
let sam = "";
let initialCases: (typeof cases.$inferSelect)[];
let initialEvents: (typeof caseEvents.$inferSelect)[];

async function login(email: string) {
  const response = await auth.api.signInEmail({
    body: { email, password: demoPassword }, asResponse: true,
  });
  expect(response.status).toBe(200);
  return response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
}

async function read(id = "KYC-0001", cookie = alex): Promise<CaseDetail> {
  const response = await GET(new Request(`${origin}/api/kyc/cases/${id}`, {
    headers: { cookie },
  }), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(200);
  return response.json();
}

function mutate(body: unknown, cookie = alex, id = "KYC-0001", requestOrigin = origin) {
  return POST(new Request(`${origin}/api/kyc/cases/${id}`, {
    method: "POST", headers: { cookie, origin: requestOrigin, "content-type": "application/json" },
    body: JSON.stringify(body),
  }), { params: Promise.resolve({ id }) });
}

beforeAll(async () => {
  migrate(db, { migrationsFolder: "./drizzle" });
  await seed(db);
  viewer = await login("viewer@example.test");
  alex = await login("alex@example.test");
  sam = await login("sam@example.test");
  initialCases = db.select().from(cases).all();
  initialEvents = db.select().from(caseEvents).all();
});

beforeEach(() => {
  db.transaction((tx) => {
    tx.delete(caseEvents).run();
    tx.delete(cases).run();
    tx.insert(cases).values(initialCases).run();
    tx.insert(caseEvents).values(initialEvents).run();
  });
});

afterAll(() => sqlite.close());

describe("clean database and server identity", () => {
  it("migrates, seeds and authenticates all roles with hashed passwords", async () => {
    expect(db.select().from(user).all()).toHaveLength(3);
    expect(db.select().from(cases).all()).toHaveLength(12);
    expect(db.select().from(account).all().every((row) => row.password !== demoPassword)).toBe(true);
    await seed(db);
    expect(db.select().from(cases).all()).toEqual(initialCases);
    expect(db.select().from(caseEvents).all()).toEqual(initialEvents);
    const response = await auth.api.signUpEmail({
      body: { name: "Unauthorized", email: "new@example.test", password: demoPassword },
      asResponse: true,
    });
    expect(response.status).not.toBe(200);
    expect(db.select().from(user).all()).toHaveLength(3);
  });

  it("rejects unauthenticated queue/detail reads and mutations", async () => {
    const request = new Request(`${origin}/api/kyc/cases`);
    expect((await queueGET(request)).status).toBe(401);
    expect((await GET(request, { params: Promise.resolve({ id: "KYC-0001" }) })).status).toBe(401);
    expect((await mutate({ action: "decide", status: "approved", version: 0 }, "")).status).toBe(401);
    expect(await read()).toEqual({ case: expect.objectContaining({ version: 0 }), events: [] });
  });

  it.each(["queue", "detail", "mutation"] as const)("fails closed when session lookup fails during %s", async (operation) => {
    const before = await read();
    const sessionLookup = vi.spyOn(auth.api, "getSession").mockRejectedValue(new Error("synthetic-private-session-detail"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const request = new Request(`${origin}/api/kyc/cases`, { headers: { cookie: alex } });
      const response = operation === "queue" ? await queueGET(request)
        : operation === "detail" ? await GET(request, { params: Promise.resolve({ id: "KYC-0001" }) })
          : await mutate({ action: "decide", status: "approved", version: 0 });
      const body = await response.json();
      expect(response.status).toBe(500);
      expect(body.errorId).toMatch(/^[0-9a-f-]{36}$/);
      expect(body.error).toContain(`Reference: ${body.errorId}`);
      expect(JSON.stringify(body)).not.toContain("synthetic-private-session-detail");
      expect(log).toHaveBeenCalledTimes(1);
      expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({
        errorId: body.errorId,
        operation: { queue: "kyc.queue.read", detail: "kyc.case.read", mutation: "kyc.case.write" }[operation],
      });
    } finally {
      sessionLookup.mockRestore();
      log.mockRestore();
    }
    expect(await read()).toEqual(before);
  });

  it("allows Viewer reads but denies decisions and assignment", async () => {
    await read("KYC-0001", viewer);
    for (const body of [
      { action: "assign", assigneeId: "reviewer-sam", version: 0 },
      { action: "decide", status: "approved", version: 0 },
      { action: "decide", status: "approved", version: 0, role: "reviewer", actorId: "reviewer-alex" },
    ]) expect((await mutate(body, viewer)).status).toBe(403);
    expect((await read()).events).toEqual([]);
  });

  it("rejects forged identity fields and cross-origin writes", async () => {
    const body = { action: "decide", status: "approved", version: 0 };
    for (const claim of [{ actorId: "reviewer-sam" }, { role: "reviewer" }, { actor: "reviewer-sam" }]) {
      expect((await mutate({ ...body, ...claim })).status).toBe(400);
    }
    expect((await mutate(body, alex, "KYC-0001", "https://untrusted.example")).status).toBe(403);
    expect((await mutate(body, alex, "KYC-0001", "")).status).toBe(403);
    expect((await read()).case.version).toBe(0);
    expect((await read()).events).toEqual([]);
  });

  it("rechecks the persisted role and rejects a revoked session", async () => {
    db.update(user).set({ role: "viewer" }).where(eq(user.id, "reviewer-alex")).run();
    try {
      expect((await mutate({ action: "decide", status: "approved", version: 0 })).status).toBe(403);
    } finally {
      db.update(user).set({ role: "reviewer" }).where(eq(user.id, "reviewer-alex")).run();
    }
    const freshCookie = await login("viewer@example.test");
    await auth.api.signOut({ headers: new Headers({ cookie: freshCookie }) });
    expect((await mutate({ action: "decide", status: "approved", version: 0 }, freshCookie)).status).toBe(401);
  });
});

describe("queue queries", () => {
  it.each([
    ["search=EXAMPLE.TEST", 12],
    ["search=customer1%40example.test", 1],
    ["search=unmatched", 0],
    ["country=GB", 2],
    ["country=ZZ", 0],
    ["status=approved", 1],
    ["assignee=reviewer-alex", 4],
    ["assignee=unassigned", 4],
    ["status=pending&country=GB", 2],
    ["search=%25", 0],
    ["search=%27%20OR%201%3D1", 0],
  ])("filters %s", async (query, count) => {
    const response = await queueGET(new Request(`${origin}/api/kyc/cases?${query}`, {
      headers: { cookie: viewer },
    }));
    expect(response.status).toBe(200);
    const data: QueueData = await response.json();
    expect(data.cases).toHaveLength(count);
    expect(data.reviewers).toHaveLength(2);
    expect(data.countries).toEqual(["AU", "CA", "DE", "FR", "GB", "US"]);
  });

  it.each(["role=reviewer", "status=unknown", "country=gb", "assignee=", `search=${"a".repeat(121)}`])(
    "rejects invalid query %s", async (query) => {
      expect((await queueGET(new Request(`${origin}/api/kyc/cases?${query}`, {
        headers: { cookie: viewer },
      }))).status).toBe(400);
    },
  );
});

describe("assignment ownership and decisions", () => {
  it("assigns, reassigns and lets another Reviewer decide; seed preserves the result", async () => {
    expect((await mutate({ action: "assign", assigneeId: "reviewer-alex", version: 0 })).status).toBe(200);
    expect((await mutate({ action: "assign", assigneeId: "reviewer-sam", version: 1 })).status).toBe(200);
    expect((await mutate({ action: "decide", status: "approved", version: 2, reason: "Reviewed" })).status).toBe(200);
    const persisted = await read();
    expect(persisted.case).toMatchObject({ status: "approved", assigneeId: "reviewer-sam", version: 3 });
    expect(persisted.events).toEqual([
      expect.objectContaining({ kind: "assignment", actorName: "Alex Chen", fromAssigneeName: null, toAssigneeName: "Alex Chen" }),
      expect.objectContaining({ kind: "assignment", fromAssigneeName: "Alex Chen", toAssigneeName: "Sam Rivera" }),
      expect.objectContaining({ kind: "decision", actorName: "Alex Chen", fromStatus: "pending", toStatus: "approved", reason: "Reviewed" }),
    ]);
    expect(persisted.events.every((event) => Number.isFinite(Date.parse(event.createdAt)))).toBe(true);
    await seed(db);
    expect(await read()).toEqual(persisted);
  });

  it.each([
    ["pending", "approved", true], ["pending", "rejected", true], ["pending", "escalated", true],
    ["escalated", "approved", true], ["escalated", "rejected", true], ["escalated", "escalated", false],
    ["approved", "approved", false], ["approved", "rejected", false], ["approved", "escalated", false],
    ["rejected", "approved", false], ["rejected", "rejected", false], ["rejected", "escalated", false],
  ] as const)("%s → %s allowed=%s", async (from, to, allowed) => {
    db.update(cases).set({ status: from }).where(eq(cases.id, "KYC-0001")).run();
    const before = await read();
    const response = await mutate({ action: "decide", status: to, version: 0, reason: "  Checked  " }, sam);
    expect(response.status).toBe(allowed ? 200 : 409);
    const after = await read();
    if (!allowed) expect(after).toEqual(before);
    else {
      expect(after.case).toMatchObject({ status: to, version: 1, reviewReason: "Checked" });
      expect(after.events).toEqual([expect.objectContaining({
        actorName: "Sam Rivera", fromStatus: from, toStatus: to, reason: "Checked",
      })]);
    }
  });

  it.each(statuses)("assignment on %s respects terminal state", async (status) => {
    db.update(cases).set({ status }).where(eq(cases.id, "KYC-0001")).run();
    const allowed = status === "pending" || status === "escalated";
    expect((await mutate({ action: "assign", assigneeId: "reviewer-sam", version: 0 })).status).toBe(allowed ? 200 : 409);
    expect((await read()).events).toHaveLength(allowed ? 1 : 0);
  });

  it.each([
    { action: "assign", assigneeId: "viewer", version: 0 },
    { action: "assign", assigneeId: "missing", version: 0 },
    { action: "decide", status: "rejected", version: 0 },
    { action: "decide", status: "rejected", reason: " \n ", version: 0 },
    { action: "decide", status: "pending", version: 0 },
    { action: "decide", status: "approved", version: -1 },
    { action: "decide", status: "approved", version: "0" },
    { action: "decide", status: "approved", version: 0, reason: "a".repeat(1001) },
    { action: "delete", version: 0 },
  ])("rejects invalid input without effects: $action $status $assigneeId", async (body) => {
    const before = await read();
    expect((await mutate(body)).status).toBe(400);
    expect(await read()).toEqual(before);
  });

  it("rejects malformed JSON and unknown cases", async () => {
    const request = new Request(`${origin}/api/kyc/cases/KYC-0001`, {
      method: "POST", headers: { cookie: alex, origin }, body: "{broken",
    });
    expect((await POST(request, { params: Promise.resolve({ id: "KYC-0001" }) })).status).toBe(400);
    expect((await mutate({ action: "decide", status: "approved", version: 0 }, alex, "missing")).status).toBe(404);
  });

  it("rejects duplicate assignment and stale/repeated decisions", async () => {
    const assign = { action: "assign", assigneeId: "reviewer-sam", version: 0 };
    expect((await mutate(assign)).status).toBe(200);
    expect((await mutate({ ...assign, version: 1 })).status).toBe(409);
    expect((await mutate({ action: "decide", status: "approved", version: 0 })).status).toBe(409);
    const decision = { action: "decide", status: "approved", version: 1 };
    expect((await mutate(decision)).status).toBe(200);
    expect((await mutate(decision)).status).toBe(409);
    expect((await read()).events).toHaveLength(2);
  });

  it("allows only one of two competing decisions", async () => {
    const results = await Promise.all([
      mutate({ action: "decide", status: "approved", version: 0 }, alex),
      mutate({ action: "decide", status: "rejected", version: 0, reason: "Conflicting review" }, sam),
    ]);
    expect(results.map((response) => response.status).sort()).toEqual([200, 409]);
    const persisted = await read();
    expect(persisted.events).toHaveLength(1);
    expect(persisted.case.status).toBe(persisted.events[0].toStatus);
    expect(persisted.case.version).toBe(1);
  });

  it.each(["assign", "decide"])("rolls back %s when event insertion fails", async (action) => {
    const before = await read();
    sqlite.exec("CREATE TRIGGER fail_event BEFORE INSERT ON case_event BEGIN SELECT RAISE(ABORT, 'injected failure'); END");
    try {
      const body = action === "assign" ? { action, assigneeId: "reviewer-sam", version: 0 }
        : { action, status: "approved", version: 0 };
      expect((await mutate(body)).status).toBe(500);
      expect(await read()).toEqual(before);
    } finally {
      sqlite.exec("DROP TRIGGER fail_event");
    }
  });
});
