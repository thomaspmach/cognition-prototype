"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { DetailPanel } from "@/components/shared/detail-panel";
import { Feedback } from "@/components/shared/feedback";
import { kycRequest } from "@/lib/kyc/client";
import { isTerminal, type CaseDetail as Detail, type Reviewer } from "@/lib/kyc/model";
import { CaseActions } from "./case-actions";
import { CaseHistory } from "./case-history";
import { CaseStatusBadge } from "./case-status";

export function CaseDetail({ id, reviewers, role, onChanged, onClose }: {
  id: string | null; reviewers: Reviewer[]; role: "viewer" | "reviewer";
  onChanged: () => void; onClose: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    async function load(caseId: string) {
      setLoading(true);
      setError("");
      setSuccess("");
      setDetail(null);
      try {
        const data = await kycRequest<Detail>(`/api/kyc/cases/${encodeURIComponent(caseId)}`, { signal: controller.signal });
        if (!controller.signal.aborted) setDetail(data);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load case.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load(id);
    return () => controller.abort();
  }, [id, reload]);

  const current = detail?.case.id === id ? detail : null;
  const record = current?.case;

  return (
    <DetailPanel open={Boolean(id)} onOpenChange={(open) => { if (!open) onClose(); }}
      title={record?.customerName || "Case details"} ariaLabel={id || "Case details"}
      description={id || "Onboarding review"}
      badge={record && <CaseStatusBadge status={record.status} />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Case summary</h3>
          <button type="button" onClick={() => setReload((value) => value + 1)} disabled={loading}
            className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">
            <RefreshCw aria-hidden="true" className="size-3.5" />
            Reload details
          </button>
        </div>
        {loading ? <Feedback>Loading case details…</Feedback> : error ? <Feedback tone="error">{error}</Feedback> : current && record && (
          <>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm min-[440px]:grid-cols-2">
              {[
                ["Email", record.customerEmail],
                ["Country", record.country],
                ["Submitted", `${record.submittedAt.slice(0, 16).replace("T", " ")} UTC`],
                ["Risk score", `${record.riskScore} / 100 · Informational only`],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 break-words">{value}</dd>
                </div>
              ))}
            </dl>
            {(role === "viewer" || isTerminal(record.status)) && (
              <div className="border-t pt-5 text-sm">
                <p className="text-xs text-muted-foreground">Assigned reviewer</p>
                <p className="mt-1">{record.assigneeName || "Unassigned"}</p>
                {record.reviewReason && <p className="mt-3 whitespace-pre-wrap break-words">{record.reviewReason}</p>}
              </div>
            )}
            {success && <Feedback tone="success">{success}</Feedback>}
            <CaseActions key={`${id}-${record.version}`} detail={current} reviewers={reviewers} role={role}
              onSaved={(updated) => {
                setDetail(updated);
                setSuccess("Saved. Case and activity are up to date.");
                onChanged();
              }} />
            <CaseHistory events={current.events} />
          </>
        )}
      </div>
    </DetailPanel>
  );
}
