"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import type { CommunitySection } from "@/features/community/components/community-sidebar";
import { WorkspaceRouteShell } from "@/components/workspace-route-shell";
import { WorkspaceSectionSkeleton } from "@/components/workspace-section-skeleton";

const ChatLayout = dynamic(
  () =>
    import("@/components/chat/chat-layout").then(
      (module) => module.ChatLayout,
    ),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
const CommunityDetailPremium = dynamic(
  () =>
    import("@/features/community/components/community-detail-premium").then(
      (module) => module.CommunityDetailPremium,
    ),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
const TradeDetailPage = dynamic(
  () =>
    import("@/features/trades/components/trade-detail-page").then(
      (module) => module.TradeDetailPage,
    ),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

export function CommunityDetailRoute({
  communityId,
  active,
}: {
  communityId: string;
  active: CommunitySection;
}) {
  return (
    <WorkspaceRouteShell
      section="community"
      community={{ communityId, active }}
    >
      {active === "chat" ? (
        <ChatLayout communityId={communityId} />
      ) : (
        <CommunityDetailPremium
          communityId={communityId}
          activeTab={active}
        />
      )}
    </WorkspaceRouteShell>
  );
}

export function TradeDetailRoute({ tradeId }: { tradeId: string }) {
  const router = useRouter();
  return (
    <WorkspaceRouteShell section="trades">
      <TradeDetailPage
        tradeId={tradeId}
        onBack={() => router.push("/trades")}
      />
    </WorkspaceRouteShell>
  );
}
