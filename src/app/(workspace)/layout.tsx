import type { ReactNode } from "react";

import { WorkspaceRouteLayout } from "@/components/workspace-route-layout";
import { getWorkspaceBootstrap } from "@/lib/server/workspace-bootstrap";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Resolved on the server so the shell's first paint already has accounts and
  // the admin flag, instead of discovering both after hydration.
  const bootstrap = await getWorkspaceBootstrap();

  return (
    <WorkspaceRouteLayout bootstrap={bootstrap}>{children}</WorkspaceRouteLayout>
  );
}
