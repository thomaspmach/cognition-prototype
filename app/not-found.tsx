import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";

export default function NotFound() {
  return (
    <>
      <PageHeader eyebrow="404" title="Page not found" description="This destination is not part of the workspace." />
      <Link href="/" className="rounded-md text-sm font-medium text-primary hover:underline">Return to Overview</Link>
    </>
  );
}
