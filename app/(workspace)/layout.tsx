import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requirePageActor } from "@/lib/server/page-access";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const actor = await requirePageActor();
  return <WorkspaceShell actor={actor}>{children}</WorkspaceShell>;
}
