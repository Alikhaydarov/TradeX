import { Suspense, type ReactNode } from "react";

import { WorkspaceSectionSkeleton } from "@/components/workspace-section-skeleton";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<WorkspaceSectionSkeleton />}>
      {children}
    </Suspense>
  );
}
