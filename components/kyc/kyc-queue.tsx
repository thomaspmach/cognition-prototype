"use client";

import { Inbox } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { TableColumn } from "@/components/motion/table";
import { ActionButton } from "@/components/shared/action-button";
import { DetailPanel } from "@/components/shared/detail-panel";
import { Feedback } from "@/components/shared/feedback";
import { QueueTable } from "@/components/shared/queue-table";
import { kycRequest } from "@/lib/kyc/client";
import type { CaseRecord, QueueData } from "@/lib/kyc/model";
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
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== "")).toString();

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await kycRequest<QueueData>(`/api/kyc/cases?${query}`, { signal: controller.signal });
        setData(result);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load queue.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [query, reload]);

  const columns: TableColumn<CaseRecord>[] = [
    { key: "id", header: "Case", width: "120px", cell: (record) => (
      <button onClick={() => router.replace(`/tools/kyc?case=${encodeURIComponent(record.id)}`, { scroll: false })}
        aria-label={`Open ${record.id}`} className="rounded text-sm font-medium text-primary hover:underline">
        {record.id}
      </button>
    ) },
    { key: "customerName", header: "Customer", width: "230px", cell: (record) => (
      <div><p className="font-medium">{record.customerName}</p><p className="mt-0.5 text-xs text-muted-foreground">{record.customerEmail}</p></div>
    ) },
    { key: "country", header: "Country", width: "90px" },
    { key: "status", header: "Status", width: "130px", cell: (record) => <CaseStatusBadge status={record.status} /> },
    { key: "assigneeName", header: "Assignee", width: "140px", cell: (record) => record.assigneeName || <span className="text-muted-foreground">Unassigned</span> },
    { key: "submittedAt", header: "Submitted (UTC)", width: "150px", cell: (record) => record.submittedAt.slice(0, 16).replace("T", " ") },
  ];

  return (
    <section className="mt-8" aria-labelledby="queue-title">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="queue-title" className="font-semibold">Onboarding queue</h2>
          <p className="mt-1 text-xs text-muted-foreground">Oldest submissions first · Synthetic data</p>
        </div>
        <ActionButton onClick={() => setReload((value) => value + 1)} disabled={loading}>Refresh queue</ActionButton>
      </div>
      <QueueFilters values={filters} onChange={setFilters} reviewers={data.reviewers} countries={data.countries} />
      <div className="my-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <p role="status">{loading ? "Loading cases…" : error ? "Queue unavailable" : `${data.cases.length} cases shown`}</p>
        {query && <button className="rounded text-primary hover:underline" onClick={() => setFilters(emptyFilters)}>Clear filters</button>}
      </div>
      {error ? <Feedback tone="error">{error} Use Refresh queue to retry.</Feedback> : (
        <QueueTable<CaseRecord> data={data.cases} columns={columns} getRowId={(record) => record.id}
          loading={loading} rowHeight={64} height={460} emptyState={
            <div className="px-4 py-12 text-center">
              <Inbox aria-hidden="true" className="mx-auto mb-3 size-6 text-muted-foreground" />
              <h3 className="font-medium">No matching cases</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try another search or clear your filters.</p>
            </div>
          } />
      )}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">Select a case to view its details and chronological history. Risk scores never make decisions.</p>
      <DetailPanel open={Boolean(selectedId)} onOpenChange={(open) => {
        if (!open) router.replace("/tools/kyc", { scroll: false });
      }} title={selectedId || "Case details"} description="Onboarding review · Synthetic case">
        {selectedId && <CaseDetail key={selectedId} id={selectedId} reviewers={data.reviewers} role={role}
          onChanged={() => setReload((value) => value + 1)} />}
      </DetailPanel>
    </section>
  );
}
