import { PageHeader } from "@/components/shared/page-header";
import { ToolCatalog } from "@/components/workspace/tool-catalog";

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        eyebrow="Your workspace"
        title="Overview"
        description="One place for the tools behind your operations. Find a tool, see who owns it, and pick up where work begins."
      />
      <ToolCatalog />
      <div className="mt-8 flex flex-wrap justify-between gap-3 border-t pt-5 text-xs leading-5 text-muted-foreground">
        <p>KYC is the first UI foundation. More tools are planned.</p>
        <p>Access labels describe planned roles; authentication is not connected.</p>
      </div>
    </>
  );
}
