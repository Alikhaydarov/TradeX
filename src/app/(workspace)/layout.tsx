import type { ReactNode } from "react";

import { WorkspaceRouteLayout } from "@/components/workspace-route-layout";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceRouteLayout>{children}</WorkspaceRouteLayout>;
}
