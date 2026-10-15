import {
  AppShell,
  type WorkspaceUser,
  type TradingAccount,
} from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSelectedAccountId } from "@/lib/selected-account";
import { getWorkspaceBootstrap } from "@/lib/workspace-bootstrap";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { WorkspaceQueryProvider } from "@/components/workspace-query-provider";
import { WorkspaceLoader } from "@/components/workspace-loader";

export const dynamic = "force-dynamic";

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<WorkspaceLoader fullscreen />}>
      <ProductWorkspace>{children}</ProductWorkspace>
    </Suspense>
  );
}

async function ProductWorkspace({ children }: { children: React.ReactNode }) {
  let user: WorkspaceUser | undefined;
  let accounts: TradingAccount[] = [];
  if (isSupabaseConfigured()) {
    const data = await getWorkspaceBootstrap();
    if (!data.user) redirect("/sign-in");
    const name = String(
      data.profile?.full_name ||
        data.user.user_metadata?.full_name ||
        data.user.email?.split("@")[0] ||
        "Trader",
    );
    const avatar =
      data.profile?.avatar_url || data.user.user_metadata?.avatar_url;
    user = {
      id: data.user.id,
      name,
      email: data.user.email || "",
      initials: name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase(),
      username: data.profile?.username ?? undefined,
      avatarUrl: typeof avatar === "string" ? avatar : null,
    };
    accounts = data.accounts;
  }
  const selectedAccountId = await getSelectedAccountId();
  const pnlMode = (await cookies()).get("tradoxy_pnl")?.value;
  return (
    <WorkspaceQueryProvider key={user?.id ?? "anonymous"}>
      <AppShell
        user={user}
        initialAccounts={accounts}
        initialSelectedAccountId={selectedAccountId}
        initialPnlMode={
          pnlMode === "percentage" || pnlMode === "hidden" ? pnlMode : "money"
        }
      >
        {children}
      </AppShell>
    </WorkspaceQueryProvider>
  );
}
