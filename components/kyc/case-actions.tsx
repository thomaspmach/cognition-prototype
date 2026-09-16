"use client";

import { ChevronDown, CircleHelp } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
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
  const [decision, setDecision] = useState<"" | "approved" | "rejected" | "escalated">("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"assign" | "decide" | null>(null);
  const [error, setError] = useState("");
  const [reasonInvalid, setReasonInvalid] = useState(false);
  const [showAssignmentHelp, setShowAssignmentHelp] = useState(false);
  const isFinalDecision = decision === "approved" || decision === "rejected";

  useEffect(() => {
    if (!showAssignmentHelp) return;
    function dismiss(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setShowAssignmentHelp(false);
    }
    // Dismiss the tooltip before the drawer, including when opened by hover.
    window.addEventListener("keydown", dismiss, true);
    return () => window.removeEventListener("keydown", dismiss, true);
  }, [showAssignmentHelp]);

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
    if (!decision) return;
    void save({ action: "decide", status: decision, reason, version: record.version });
  }

  return (
    <div className="space-y-6 border-t pt-6">
      <section aria-labelledby="assignment-title">
        <div className="flex items-center gap-2">
          <h3 id="assignment-title" className="text-sm font-semibold">Assigned reviewer</h3>
          <span className="relative inline-flex" onMouseEnter={() => setShowAssignmentHelp(true)}
            onMouseLeave={() => setShowAssignmentHelp(false)}>
            <button type="button" aria-label="About reviewer assignment"
              aria-describedby={showAssignmentHelp ? "assignment-help" : undefined}
              onFocus={() => setShowAssignmentHelp(true)} onBlur={() => setShowAssignmentHelp(false)}
              onClick={() => setShowAssignmentHelp(true)}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
              <CircleHelp aria-hidden="true" className="size-4" />
            </button>
            {showAssignmentHelp && <span id="assignment-help" role="tooltip"
              className="absolute left-1/2 top-full z-10 w-64 -translate-x-1/2 pt-2">
              <span className="block rounded-lg border bg-card px-3 py-2 text-xs leading-5 text-foreground shadow-lg">
                Any authorized Reviewer can act, regardless of the assignee.
              </span>
            </span>}
          </span>
        </div>
        <form className="mt-3 flex items-end gap-3" onSubmit={(event) => {
          event.preventDefault();
          void save({ action: "assign", assigneeId, version: record.version });
        }}>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium"><span className="sr-only">Assign to</span>
            <span className="relative">
              <select required className={`${selectClassName} appearance-none pr-10`} value={assigneeId} disabled={busy !== null}
                onChange={(event) => setAssigneeId(event.target.value)}>
                <option value="" disabled>Unassigned — choose a Reviewer</option>
                {reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.name}</option>)}
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </span>
          </label>
          <ActionButton type="submit" className="h-11 shrink-0 border bg-card text-foreground hover:bg-muted" state={busy === "assign" ? "loading" : "idle"}
            disabled={busy !== null || assigneeId === record.assigneeId || !assigneeId} loadingText="Saving">
            {record.assigneeId ? "Reassign" : "Assign"}
          </ActionButton>
        </form>
      </section>
      <form onSubmit={decide} className="space-y-3 rounded-xl border bg-background p-4 sm:p-5">
        <h3 className="pb-2 text-sm font-semibold">Review decision</h3>
        <label className="flex flex-col gap-1.5 text-sm font-medium">Decision
          <span className="relative">
            <select required className={`${selectClassName} appearance-none pr-10`} value={decision} disabled={busy !== null}
              aria-describedby={isFinalDecision ? "decision-hint" : undefined}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "approved" || value === "rejected" || value === "escalated") setDecision(value);
                setError("");
                setReasonInvalid(false);
              }}>
              <option value="" disabled>Choose a decision</option>
              {transitions[record.status].map((status) => (
                <option key={status} value={status}>{{ approved: "Approve", rejected: "Reject", escalated: "Escalate", pending: "Pending" }[status]}</option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="decision-reason">
          Reason {decision === "rejected" ? "(required)" : "(optional)"}
          <textarea id="decision-reason" rows={2} maxLength={1000} disabled={busy !== null}
            aria-required={decision === "rejected"} aria-invalid={reasonInvalid}
            aria-describedby={error ? "case-action-error" : undefined}
            value={reason} onChange={(event) => setReason(event.target.value)}
            className="w-full resize-y rounded-lg border bg-card px-3 py-2 font-normal" />
        </label>
        {isFinalDecision && <p id="decision-hint" role="status" className="text-xs leading-5 text-muted-foreground">
          This decision is final.
        </p>}
        <ActionButton type="submit" state={busy === "decide" ? "loading" : "idle"} disabled={busy !== null || !decision}
          aria-describedby={isFinalDecision ? "decision-hint" : undefined}
          loadingText="Saving decision" className="bg-primary text-primary-foreground">
          Save decision
        </ActionButton>
      </form>
      {error && <div id="case-action-error"><Feedback tone="error">{error}</Feedback></div>}
    </div>
  );
}
