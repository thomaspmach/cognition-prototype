"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { Feedback } from "@/components/shared/feedback";
import { kycRequest } from "@/lib/kyc/client";
import type { CaseDetail as Detail, Reviewer } from "@/lib/kyc/model";
import { CaseActions } from "./case-actions";
import { CaseHistory } from "./case-history";
import { CaseStatusBadge } from "./case-status";

export function CaseDetail({ id, reviewers, role, onChanged }: {
  id: string; reviewers: Reviewer[]; role: "viewer" | "reviewer"; onChanged: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await kycRequest<Detail>(`/api/kyc/cases/${encodeURIComponent(id)}`, { signal: controller.signal });
        setDetail(data);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load case.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [id, reload]);

  return (
    <div className="space-y-5">
      <ActionButton onClick={() => { setSuccess(""); setReload((value) => value + 1); }} disabled={loading}>Reload details</ActionButton>
      {loading ? <Feedback>Loading case details…</Feedback> : error ? <Feedback tone="error">{error}</Feedback> : detail && (
        <>
          {success && <Feedback tone="success">{success}</Feedback>}
          <CaseStatusBadge status={detail.case.status} />
          <dl className="divide-y border-y text-sm">
            {[
              ["Customer", detail.case.customerName], ["Email", detail.case.customerEmail],
              ["Country", detail.case.country], ["Submitted", `${detail.case.submittedAt.slice(0, 16).replace("T", " ")} UTC`],
              ["Assignee", detail.case.assigneeName || "Unassigned"],
              ["Risk score", `${detail.case.riskScore} / 100 · Informational only`],
              ["Review reason", detail.case.reviewReason || "No reason recorded"],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[90px_1fr] gap-4 py-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="whitespace-pre-wrap break-words">{value}</dd>
              </div>
            ))}
          </dl>
          <CaseActions key={`${id}-${detail.case.version}`} detail={detail} reviewers={reviewers} role={role}
            onSaved={(updated) => {
              setDetail(updated);
              setSuccess("Saved. Case and history are up to date.");
              onChanged();
            }} />
          <CaseHistory events={detail.events} />
        </>
      )}
    </div>
  );
}
