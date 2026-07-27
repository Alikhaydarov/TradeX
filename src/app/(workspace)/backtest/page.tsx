import type { Metadata } from "next";

import { BacktestWorkspace } from "@/components/backtest/backtest-workspace";
import { WorkspaceRouteShell } from "@/components/workspace-route-shell";

export const metadata: Metadata = {
  title: "Backtest | Tradox",
};

export default function BacktestPage() {
  return (
    <WorkspaceRouteShell section="backtest">
      <BacktestWorkspace />
    </WorkspaceRouteShell>
  );
}
