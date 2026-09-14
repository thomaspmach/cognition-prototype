import type { Metadata } from "next";
import { Feedback } from "@/components/shared/feedback";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { KycFoundation } from "@/components/workspace/kyc-foundation";
import { toolRegistry } from "@/lib/tool-registry";

const tool = toolRegistry.find((entry) => entry.id === "kyc")!;

export const metadata: Metadata = { title: tool.name };

export default function KycPage() {
  return (
    <>
      <PageHeader eyebrow={tool.responsibleTeam} title={tool.name} description={tool.description}>
        <StatusBadge status="info">UI foundation</StatusBadge>
      </PageHeader>
      <Feedback>
        <strong className="font-medium">Foundation only.</strong> This destination validates the shared workspace. The functional KYC workflow will arrive in issue #3.
      </Feedback>
      <KycFoundation />
    </>
  );
}
