import { PageHeader } from "@/components/shared/page-header";
import { ToolCatalog } from "@/components/workspace/tool-catalog";
import { requirePageActor } from "@/lib/server/page-access";

export default async function OverviewPage() {
  await requirePageActor();
  return (
    <>
      <PageHeader title="Overview" />
      <ToolCatalog />
    </>
  );
}
