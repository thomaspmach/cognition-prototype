"use client";

import { Inbox, PanelRightOpen } from "lucide-react";
import { useState } from "react";
import type { TableColumn } from "@/components/motion/table";
import { ActionButton } from "@/components/shared/action-button";
import { DetailPanel } from "@/components/shared/detail-panel";
import { QueueTable } from "@/components/shared/queue-table";
import { StatusBadge } from "@/components/shared/status-badge";

type FoundationRow = { id: string; customer: string; country: string; status: string };

const columns: TableColumn<FoundationRow>[] = [
  { key: "id", header: "Case", width: "160px" },
  { key: "customer", header: "Customer", width: "240px" },
  { key: "country", header: "Country", width: "160px" },
  { key: "status", header: "Status", width: "180px" },
];

export function KycFoundation() {
  const [detailOpen, setDetailOpen] = useState(false);
  return (
    <section aria-labelledby="queue-title" className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="queue-title" className="font-semibold">Queue layout</h2>
          <p className="mt-1 text-xs text-muted-foreground">Shared table and detail primitives, ready for case data.</p>
        </div>
        <ActionButton onClick={() => setDetailOpen(true)} icon={<PanelRightOpen aria-hidden="true" className="size-4" />}>
          View panel example
        </ActionButton>
      </div>
      <QueueTable<FoundationRow>
        data={[]}
        columns={columns}
        getRowId={(row) => row.id}
        height={300}
        emptyState={
          <div className="px-4 py-12 text-center">
            <Inbox aria-hidden="true" className="mx-auto mb-3 size-6 text-muted-foreground" />
            <h3 className="font-medium text-foreground">No case data connected</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The functional case-review workflow belongs to issue #3.
            </p>
          </div>
        }
      />
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        This screen demonstrates layout only. It contains no customer records or review actions.
      </p>
      <DetailPanel
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title="Detail panel example"
        description="A reusable panel for future record details. No case is selected."
      >
        <StatusBadge status="info">UI foundation</StatusBadge>
        <dl className="mt-6 divide-y border-y text-sm">
          <div className="flex justify-between gap-4 py-4">
            <dt className="text-muted-foreground">Content</dt>
            <dd>Layout example</dd>
          </div>
          <div className="flex justify-between gap-4 py-4">
            <dt className="text-muted-foreground">Data connection</dt>
            <dd>Not connected</dd>
          </div>
        </dl>
        <p className="mt-6 text-sm leading-6 text-muted-foreground">
          Authentication, persistence and review behavior will be added with the KYC workflow.
        </p>
      </DetailPanel>
    </section>
  );
}
