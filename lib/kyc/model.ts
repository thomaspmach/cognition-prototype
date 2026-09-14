import { z } from "zod";

export const statuses = ["pending", "approved", "rejected", "escalated"] as const;
export type CaseStatus = (typeof statuses)[number];
export const statusLabels: Record<CaseStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  escalated: "Escalated",
};

export const transitions: Record<CaseStatus, readonly CaseStatus[]> = {
  pending: ["approved", "rejected", "escalated"],
  escalated: ["approved", "rejected"],
  approved: [],
  rejected: [],
};

export function isTerminal(status: CaseStatus) {
  return transitions[status].length === 0;
}

export const caseQuerySchema = z.strictObject({
  search: z.string().trim().max(120).default(""),
  status: z.enum(statuses).optional(),
  assignee: z.string().min(1).max(100).optional(),
  country: z.string().regex(/^[A-Z]{2}$/).optional(),
});

export type CaseQuery = z.infer<typeof caseQuerySchema>;

export const mutationSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("assign"),
    assigneeId: z.string().min(1).max(100),
    version: z.number().int().nonnegative(),
  }),
  z.strictObject({
    action: z.literal("decide"),
    status: z.enum(["approved", "rejected", "escalated"]),
    reason: z.string().trim().max(1000).default(""),
    version: z.number().int().nonnegative(),
  }).superRefine((value, context) => {
    if (value.status === "rejected" && !value.reason) {
      context.addIssue({ code: "custom", path: ["reason"], message: "Enter a reason for rejection." });
    }
  }),
]);

export type CaseMutation = z.infer<typeof mutationSchema>;

export type Reviewer = { id: string; name: string };
export type CaseRecord = {
  id: string;
  customerName: string;
  customerEmail: string;
  country: string;
  submittedAt: string;
  status: CaseStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  reviewReason: string | null;
  riskScore: number;
  version: number;
};

export type CaseEvent = {
  id: string;
  actorName: string;
  createdAt: string;
  kind: "assignment" | "decision";
  fromStatus: CaseStatus;
  toStatus: CaseStatus;
  fromAssigneeName: string | null;
  toAssigneeName: string | null;
  reason: string | null;
};

export type CaseDetail = { case: CaseRecord; events: CaseEvent[] };
export type QueueData = { cases: CaseRecord[]; reviewers: Reviewer[]; countries: string[] };
