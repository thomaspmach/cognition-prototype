import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { KycQueue } from "@/components/kyc/kyc-queue";
import { requirePageActor } from "@/lib/server/page-access";
import { toolRegistry } from "@/lib/tool-registry";

const tool = toolRegistry.find((entry) => entry.id === "kyc")!;

export const metadata: Metadata = { title: tool.name };

export default async function KycPage() {
  const actor = await requirePageActor();
  return (
    <>
      <PageHeader title={tool.name} />
      <KycQueue role={actor.role} />
    </>
  );
}
