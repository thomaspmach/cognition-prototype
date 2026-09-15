"use client";

import { Inbox } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import type { TableColumn } from "@/components/motion/table";
import { ActionButton } from "@/components/shared/action-button";
import { DetailPanel } from "@/components/shared/detail-panel";
import { Feedback } from "@/components/shared/feedback";
import { QueueTable } from "@/components/shared/queue-table";
import { kycRequest } from "@/lib/kyc/client";
import type { CaseRecord, QueueData } from "@/lib/kyc/model";
import { queuePresentation } from "@/lib/kyc/presentation";
import type { ColumnId } from "@/lib/kyc/presentation-schema";
import { CaseDetail } from "./case-detail";
import { CaseStatusBadge } from "./case-status";
import { emptyFilters, QueueFilters } from "./queue-filters";

export function KycQueue({ role }: { role: "viewer" | "reviewer" }) {
  const router = useRouter();
  const selectedId = useSearchParams().get("case");
  const [filters, setFilters] = useState(emptyFilters);
  const [data, setData] = useState<QueueData>({ cases: [], reviewers: [], countries: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(0);
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== "")).toString();

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await kycRequest<QueueData>(`/api/kyc/cases?${query}`, { signal: controller.signal });
        setData(result);
        setPage(0);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load queue.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [query, reload]);

  const columnMap: Record<ColumnId, TableColumn<CaseRecord>> = {
    id: { key: "id", header: "Case", width: "13%", cell: (record) => (
      <button type="button" data-case-action onClick={() => router.replace(`/tools/kyc?case=${encodeURIComponent(record.id)}`, { scroll: false })}
        aria-label={`Open ${record.id}`} className="rounded text-sm font-medium text-foreground">
        {record.id}
      </button>
    ) },
    customerName: { key: "customerName", header: "Customer", width: "28%", cell: (record) => (
      <div><p className="font-medium">{record.customerName}</p><p className="mt-0.5 text-xs text-muted-foreground">{record.customerEmail}</p></div>
    ) },
    country: { key: "country", header: "Country", width: "10%" },
    status: { key: "status", header: "Status", width: "15%", cell: (record) => <CaseStatusBadge status={record.status} /> },
    assigneeName: { key: "assigneeName", header: "Assignee", width: "16%", cell: (record) => record.assigneeName || <span className="text-muted-foreground">Unassigned</span> },
    submittedAt: { key: "submittedAt", header: "Submitted (UTC)", width: "18%", cell: (record) => record.submittedAt.slice(0, 16).replace("T", " ") },
  };
  const columns = queuePresentation.columnOrder.map((id) => columnMap[id]);
  const pageCount = Math.max(1, Math.ceil(data.cases.length / queuePresentation.pageSize));
  const visibleCases = data.cases.slice(page * queuePresentation.pageSize, (page + 1) * queuePresentation.pageSize);

  function openRow(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (event.defaultPrevented || !(target instanceof Element)
      || target.closest('a, button, input, select, textarea, label, [role="button"], [role="link"], [contenteditable="true"]')) return;
    const row = target.closest("tbody tr");
    if (!row || !event.currentTarget.contains(row)) return;
    const selection = window.getSelection();
    if (selection?.toString()) {
      for (let index = 0; index < selection.rangeCount; index++) {
        if (selection.getRangeAt(index).intersectsNode(row)) return;
      }
    }
    const action = row.querySelector<HTMLButtonElement>("button[data-case-action]");
    if (!action || action.disabled) return;
    action.focus({ preventScroll: true });
    action.click();
  }

  return (
    <section className="mt-8" aria-label="Onboarding queue">
      <QueueFilters values={filters} onChange={setFilters} reviewers={data.reviewers} countries={data.countries}>
        <ActionButton onClick={() => setReload((value) => value + 1)} disabled={loading}
          className="ml-auto h-11 shrink-0">Refresh queue</ActionButton>
      </QueueFilters>
      <div className="my-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <p role="status" className={!loading && !error ? "sr-only" : undefined}>{loading ? "Loading cases…" : error ? "Queue unavailable" : `${data.cases.length} matching cases`}</p>
        {query && <button className="ml-auto rounded text-primary hover:underline" onClick={() => setFilters(emptyFilters)}>Clear filters</button>}
      </div>
      {error ? <Feedback tone="error">{error} Use Refresh queue to retry.</Feedback> : (
        <div onClick={openRow} className="[&_tbody_tr:has([data-case-action])]:cursor-pointer">
          <QueueTable<CaseRecord> data={visibleCases} columns={columns} getRowId={(record) => record.id}
            loading={loading} minColumnWidth={150} rowHeight={64} height={460} emptyState={
              <div className="px-4 py-12 text-center">
                <Inbox aria-hidden="true" className="mx-auto mb-3 size-6 text-muted-foreground" />
                <h3 className="font-medium">No matching cases</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try another search or clear your filters.</p>
              </div>
            } />
        </div>
      )}
      {!error && <nav aria-label="Queue pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p aria-live="polite">Page {page + 1} of {pageCount} · {queuePresentation.pageSize} per page</p>
        <div className="flex gap-3">
          <button className="h-10 rounded-lg border bg-card px-3 disabled:opacity-50"
            disabled={loading || page === 0} onClick={() => setPage((value) => value - 1)}>Previous page</button>
          <button className="h-10 rounded-lg border bg-card px-3 disabled:opacity-50"
            disabled={loading || page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}>Next page</button>
        </div>
      </nav>}
      <DetailPanel open={Boolean(selectedId)} onOpenChange={(open) => {
        if (!open) router.replace("/tools/kyc", { scroll: false });
      }} title={selectedId || "Case details"} description="Onboarding review · Synthetic case">
        {selectedId && <CaseDetail key={selectedId} id={selectedId} reviewers={data.reviewers} role={role}
          onChanged={() => setReload((value) => value + 1)} />}
      </DetailPanel>
    </section>
  );
}
