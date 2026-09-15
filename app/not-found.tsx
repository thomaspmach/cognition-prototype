import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <Link href="/" className="rounded-md text-sm font-medium text-primary hover:underline">Return to Overview</Link>
    </>
  );
}
