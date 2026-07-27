"use client";

import { useRouter } from "next/navigation";

import { Journal } from "@/components/journal";
import { WorkspaceRouteShell } from "@/components/workspace-route-shell";

export function DashboardRoute() {
  const router = useRouter();

  return (
    <WorkspaceRouteShell section="dashboard">
      <Journal
        onLogin={() => router.push("/")}
        mode="workspace"
        forcedTab="overview"
      />
    </WorkspaceRouteShell>
  );
}
