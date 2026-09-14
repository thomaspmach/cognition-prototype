import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { KycQueue } from "@/components/kyc/kyc-queue";
import { requirePageActor } from "@/lib/server/page-access";
import { toolRegistry } from "@/lib/tool-registry";

const tool = toolRegistry.find((entry) => entry.id === "kyc")!;

export const metadata: Metadata = { title: tool.name };

export default async function KycPage() {
  const actor = await requirePageActor();
  return (
    <>
      <PageHeader eyebrow={tool.responsibleTeam} title={tool.name} description={tool.description}>
        <StatusBadge status="neutral">{actor.role === "reviewer" ? "Reviewer" : "Viewer · Read-only"}</StatusBadge>
      </PageHeader>
      <KycQueue role={actor.role} />
    </>
  );
}
