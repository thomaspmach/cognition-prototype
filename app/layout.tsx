import type { Metadata } from "next";
import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Overview · Cognition Workspace", template: "%s · Cognition Workspace" },
  description: "A shared foundation for internal operations tools.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WorkspaceShell>{children}</WorkspaceShell>
      </body>
    </html>
  );
}
