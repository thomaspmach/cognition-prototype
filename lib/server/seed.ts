import "server-only";
import { hashPassword } from "better-auth/crypto";
import type { AppDatabase } from "./database";
import { account, caseEvents, cases, user } from "./schema";

export const demoAccounts = [
  { id: "viewer", name: "Morgan Lee", email: "viewer@example.test", role: "viewer" },
  { id: "reviewer-alex", name: "Alex Chen", email: "alex@example.test", role: "reviewer" },
  { id: "reviewer-sam", name: "Sam Rivera", email: "sam@example.test", role: "reviewer" },
] as const;

export const demoPassword = "Synthetic-demo-2026!";

export async function seed(database: AppDatabase) {
  const password = await hashPassword(demoPassword);
  const now = new Date("2026-09-01T09:00:00Z");
  database.transaction((tx) => {
    for (const person of demoAccounts) {
      tx.insert(user).values({ ...person, emailVerified: true, createdAt: now, updatedAt: now })
        .onConflictDoNothing().run();
      tx.insert(account).values({
        id: `credential-${person.id}`, userId: person.id, accountId: person.id,
        providerId: "credential", password, createdAt: now, updatedAt: now,
      }).onConflictDoNothing().run();
    }
    const customers = [
      ["Avery Brooks", "GB"], ["Jordan Ellis", "US"], ["Taylor Quinn", "CA"],
      ["Riley Morgan", "DE"], ["Casey Parker", "FR"], ["Jamie Rowan", "GB"],
      ["Skyler Reed", "AU"], ["Drew Harper", "US"], ["Robin Blake", "CA"],
      ["Cameron Lane", "DE"], ["Sage Finley", "FR"], ["Quinn Sawyer", "AU"],
    ];
    for (const [index, [customerName, country]] of customers.entries()) {
      const id = `KYC-${String(index + 1).padStart(4, "0")}`;
      const status = index === 4 ? "escalated" : index === 8 ? "approved" : index === 9 ? "rejected" : "pending";
      const assigneeId = index % 3 === 0 ? null : index % 2 === 0 ? "reviewer-sam" : "reviewer-alex";
      const submittedAt = new Date(now.getTime() + index * 3_600_000).toISOString();
      const reviewReason = status === "rejected" ? "Synthetic onboarding information is incomplete."
        : status === "escalated" ? "A second review is requested for this demonstration case." : null;
      const inserted = tx.insert(cases).values({
        id, customerName, customerEmail: `customer${index + 1}@example.test`, country,
        submittedAt, status, assigneeId, reviewReason, riskScore: (index * 17 + 12) % 100,
        version: status === "pending" ? 0 : 1,
      }).onConflictDoNothing().returning({ id: cases.id }).get();
      if (inserted && status !== "pending") {
        tx.insert(caseEvents).values({
          id: `seed-event-${id}`, caseId: id, actorId: "reviewer-alex",
          createdAt: new Date(Date.parse(submittedAt) + 1_800_000).toISOString(),
          kind: "decision", fromStatus: "pending", toStatus: status,
          fromAssigneeId: assigneeId, toAssigneeId: assigneeId, reason: reviewReason, version: 1,
        }).run();
      }
    }
  });
}
