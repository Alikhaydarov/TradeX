import type { ReactNode } from "react";

import { AccountCardMenuBridge } from "@/components/account-card-menu-bridge";
import { FloatingAddTradeButton } from "@/components/floating-add-trade-button";
import { MobileTradesBridge } from "@/components/mobile-trades-bridge";
import { ProAiCoachLauncherBoundary } from "@/components/pro-ai-coach-launcher-boundary";
import { WorkspaceTailwindBoundary } from "@/components/tailwind/workspace-tailwind-boundary";
import { WorkspaceAppRouterShellV2 } from "@/components/workspace-app-router-shell-v2";
import type { WorkspaceBootstrap } from "@/lib/server/workspace-bootstrap";

export function WorkspaceRouteLayout({
  children,
  bootstrap,
}: {
  children: ReactNode;
  bootstrap?: WorkspaceBootstrap;
}) {
  return (
    <WorkspaceTailwindBoundary>
      <WorkspaceAppRouterShellV2 bootstrap={bootstrap}>
        {children}
      </WorkspaceAppRouterShellV2>
      <AccountCardMenuBridge />
      <FloatingAddTradeButton />
      <MobileTradesBridge />
      <ProAiCoachLauncherBoundary />
    </WorkspaceTailwindBoundary>
  );
}
