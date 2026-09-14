"use client";

import { useState, type FormEvent } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { Feedback } from "@/components/shared/feedback";
import { kycRequest } from "@/lib/kyc/client";
import { isTerminal, mutationSchema, transitions, type CaseDetail, type CaseMutation, type Reviewer } from "@/lib/kyc/model";
import { selectClassName } from "./queue-filters";

export function CaseActions({ detail, reviewers, role, onSaved }: {
  detail: CaseDetail; reviewers: Reviewer[]; role: "viewer" | "reviewer";
  onSaved: (detail: CaseDetail) => void;
}) {
  const record = detail.case;
  const [assigneeId, setAssigneeId] = useState(record.assigneeId || "");
  const [decision, setDecision] = useState<"approved" | "rejected" | "escalated">("approved");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"assign" | "decide" | null>(null);
  const [error, setError] = useState("");
  const [reasonInvalid, setReasonInvalid] = useState(false);

  if (isTerminal(record.status)) return <Feedback>This case is {record.status} and read-only.</Feedback>;
  if (role === "viewer") return <Feedback>Viewer access is read-only. A Reviewer can assign and decide this case.</Feedback>;

  async function save(input: CaseMutation) {
    setError("");
    setReasonInvalid(false);
    const parsed = mutationSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Check the highlighted fields.");
      setReasonInvalid(parsed.error.issues.some((issue) => issue.path[0] === "reason"));
      return;
    }
    setBusy(input.action);
    try {
      const updated = await kycRequest<CaseDetail>(`/api/kyc/cases/${encodeURIComponent(record.id)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data),
      });
      onSaved(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save. Please retry.");
    } finally {
      setBusy(null);
    }
  }

  function decide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save({ action: "decide", status: decision, reason, version: record.version });
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="assignment-title">
        <h3 id="assignment-title" className="font-semibold">Operational ownership</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Any authorized Reviewer can act, regardless of the assignee.</p>
        <form className="mt-3 flex items-end gap-2" onSubmit={(event) => {
          event.preventDefault();
          void save({ action: "assign", assigneeId, version: record.version });
        }}>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium">Assign to
            <select required className={selectClassName} value={assigneeId} disabled={busy !== null}
              onChange={(event) => setAssigneeId(event.target.value)}>
              <option value="" disabled>Choose a Reviewer</option>
              {reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.name}</option>)}
            </select>
          </label>
          <ActionButton type="submit" className="h-11" state={busy === "assign" ? "loading" : "idle"}
            disabled={busy !== null || assigneeId === record.assigneeId || !assigneeId} loadingText="Saving">
            {record.assigneeId ? "Reassign" : "Assign"}
          </ActionButton>
        </form>
      </section>
      <form onSubmit={decide} className="space-y-3 border-t pt-5">
        <h3 className="font-semibold">Record a decision</h3>
        <label className="flex flex-col gap-1.5 text-sm font-medium">Decision
          <select className={selectClassName} value={decision} disabled={busy !== null}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "approved" || value === "rejected" || value === "escalated") setDecision(value);
              setError("");
              setReasonInvalid(false);
            }}>
            {transitions[record.status].map((status) => (
              <option key={status} value={status}>{{ approved: "Approve", rejected: "Reject", escalated: "Escalate", pending: "Pending" }[status]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="decision-reason">
          Reason {decision === "rejected" ? "(required)" : "(optional)"}
          <textarea id="decision-reason" rows={3} maxLength={1000} disabled={busy !== null}
            aria-required={decision === "rejected"} aria-invalid={reasonInvalid}
            aria-describedby={error ? "decision-hint case-action-error" : "decision-hint"}
            value={reason} onChange={(event) => setReason(event.target.value)}
            className="w-full resize-y rounded-lg border bg-card px-3 py-2 font-normal" />
        </label>
        <p id="decision-hint" className="text-xs leading-5 text-muted-foreground">
          Approval and rejection are final. Escalated cases can be approved or rejected.
        </p>
        <ActionButton type="submit" state={busy === "decide" ? "loading" : "idle"} disabled={busy !== null}
          loadingText="Saving decision" className="bg-primary text-primary-foreground">
          Save decision
        </ActionButton>
      </form>
      {error && <div id="case-action-error"><Feedback tone="error">{error}</Feedback></div>}
    </div>
  );
}
