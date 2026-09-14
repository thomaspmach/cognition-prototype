import { PageHeader } from "@/components/shared/page-header";
import { ToolCatalog } from "@/components/workspace/tool-catalog";
import { requirePageActor } from "@/lib/server/page-access";

export default async function OverviewPage() {
  await requirePageActor();
  return (
    <>
      <PageHeader
        eyebrow="Your workspace"
        title="Overview"
        description="One place for the tools behind your operations. Find a tool, see who owns it, and pick up where work begins."
      />
      <ToolCatalog />
      <div className="mt-8 flex flex-wrap justify-between gap-3 border-t pt-5 text-xs leading-5 text-muted-foreground">
        <p>Review onboarding cases with your team.</p>
        <p>Local demonstration · All data is synthetic.</p>
      </div>
    </>
  );
}
