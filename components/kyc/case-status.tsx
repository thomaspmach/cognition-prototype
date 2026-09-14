import { StatusBadge } from "@/components/shared/status-badge";
import { statusLabels, type CaseStatus } from "@/lib/kyc/model";

const tones = { pending: "info", approved: "success", rejected: "danger", escalated: "warning" } as const;

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return <StatusBadge status={tones[status]}>{statusLabels[status]}</StatusBadge>;
}
