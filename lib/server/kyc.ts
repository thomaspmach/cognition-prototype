import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, getTableColumns, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import {
  caseQuerySchema, isTerminal, mutationSchema, transitions,
  type CaseDetail, type QueueData,
} from "../kyc/model";
import { requireActor, requireReviewer, RequestError } from "./access";
import { db } from "./database";
import { caseEvents, cases, user } from "./schema";

const caseIdSchema = z.string().min(1).max(100);
const assignee = alias(user, "assignee");
const previousAssignee = alias(user, "previous_assignee");
const nextAssignee = alias(user, "next_assignee");

function caseSelection() {
  return db.select({ ...getTableColumns(cases), assigneeName: assignee.name })
    .from(cases).leftJoin(assignee, eq(cases.assigneeId, assignee.id));
}

function detail(id: string): CaseDetail {
  const record = caseSelection().where(eq(cases.id, id)).get();
  if (!record) throw new RequestError(404, "Case not found.");
  const events = db.select({
    id: caseEvents.id, actorName: user.name, createdAt: caseEvents.createdAt,
    kind: caseEvents.kind, fromStatus: caseEvents.fromStatus, toStatus: caseEvents.toStatus,
    fromAssigneeName: previousAssignee.name, toAssigneeName: nextAssignee.name,
    reason: caseEvents.reason,
  }).from(caseEvents)
    .innerJoin(user, eq(caseEvents.actorId, user.id))
    .leftJoin(previousAssignee, eq(caseEvents.fromAssigneeId, previousAssignee.id))
    .leftJoin(nextAssignee, eq(caseEvents.toAssigneeId, nextAssignee.id))
    .where(eq(caseEvents.caseId, id)).orderBy(asc(caseEvents.version)).all();
  return { case: record, events };
}

export async function listCases(headers: Headers, input: unknown): Promise<QueueData> {
  await requireActor(headers);
  const query = caseQuerySchema.parse(input);
  const search = query.search.toLowerCase();
  const records = caseSelection().where(and(
    search ? sql`(instr(lower(${cases.customerName}), ${search}) > 0 or instr(lower(${cases.customerEmail}), ${search}) > 0)` : undefined,
    query.status ? eq(cases.status, query.status) : undefined,
    query.assignee === "unassigned" ? isNull(cases.assigneeId)
      : query.assignee ? eq(cases.assigneeId, query.assignee) : undefined,
    query.country ? eq(cases.country, query.country) : undefined,
  )).orderBy(asc(cases.submittedAt), asc(cases.id)).all();
  return {
    cases: records,
    reviewers: db.select({ id: user.id, name: user.name }).from(user)
      .where(eq(user.role, "reviewer")).orderBy(asc(user.name)).all(),
    countries: db.selectDistinct({ country: cases.country }).from(cases)
      .orderBy(asc(cases.country)).all().map((row) => row.country),
  };
}

export async function getCase(headers: Headers, id: string): Promise<CaseDetail> {
  await requireActor(headers);
  return detail(caseIdSchema.parse(id));
}

export async function mutateCase(headers: Headers, id: string, input: unknown): Promise<CaseDetail> {
  const actor = await requireReviewer(headers);
  caseIdSchema.parse(id);
  const mutation = mutationSchema.parse(input);
  db.transaction((tx) => {
    const current = tx.select().from(cases).where(eq(cases.id, id)).get();
    if (!current) throw new RequestError(404, "Case not found.");
    if (current.version !== mutation.version) {
      throw new RequestError(409, "This case changed. Reload its details before trying again.");
    }
    if (isTerminal(current.status)) throw new RequestError(409, "Terminal cases are read-only.");

    let assigneeId = current.assigneeId;
    let status = current.status;
    let reason = current.reviewReason;
    if (mutation.action === "assign") {
      const reviewer = tx.select({ role: user.role }).from(user)
        .where(eq(user.id, mutation.assigneeId)).get();
      if (reviewer?.role !== "reviewer") {
        throw new RequestError(400, "Choose an existing Reviewer.");
      }
      if (mutation.assigneeId === current.assigneeId) {
        throw new RequestError(409, "This Reviewer already owns the case.");
      }
      assigneeId = mutation.assigneeId;
    } else {
      if (!transitions[current.status].includes(mutation.status)) {
        throw new RequestError(409, "That decision is not permitted from the current status.");
      }
      status = mutation.status;
      reason = mutation.reason || null;
    }
    const version = current.version + 1;
    const updated = tx.update(cases).set({ assigneeId, status, reviewReason: reason, version })
      .where(and(eq(cases.id, id), eq(cases.version, current.version))).run();
    if (updated.changes !== 1) throw new RequestError(409, "This case changed. Reload its details.");
    tx.insert(caseEvents).values({
      id: randomUUID(), caseId: id, actorId: actor.id, createdAt: new Date().toISOString(),
      kind: mutation.action === "assign" ? "assignment" : "decision",
      fromStatus: current.status, toStatus: status,
      fromAssigneeId: current.assigneeId, toAssigneeId: assigneeId,
      reason: mutation.action === "decide" ? reason : null, version,
    }).run();
  }, { behavior: "immediate" });
  return detail(id);
}
