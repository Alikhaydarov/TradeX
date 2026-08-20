import type { PropAccount } from "@/components/types";
import { accountFromRow, type AccountRow } from "@/lib/workspace-accounts";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface WorkspaceBootstrap {
  accounts: PropAccount[];
  isAdmin: boolean;
}

/**
 * Resolves everything the workspace shell needs before it can render anything
 * useful, in one server-side pass.
 *
 * The client used to discover all of this after hydration, as three separate
 * round-trips to our own API (`/api/prop-accounts`, `/api/profile`,
 * `/api/admin/me`) - each of which re-authenticated and then made the same
 * Supabase query we can make directly here. Worse, a full-screen splash sat on
 * top of the app until the first two resolved, so the visible cost was the sum
 * of a cold JS bundle plus that request chain.
 *
 * Doing it here means the shell's first paint already has the data. Failures
 * are swallowed on purpose: the client store still knows how to fetch, so a
 * degraded bootstrap costs a round-trip rather than a broken page.
 */
export async function getWorkspaceBootstrap(): Promise<WorkspaceBootstrap> {
  const empty: WorkspaceBootstrap = { accounts: [], isAdmin: false };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return empty;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return empty;

  const [accountsResult, adminResult] = await Promise.all([
    supabase
      .from("prop_accounts")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("is_admin"),
  ]);

  return {
    accounts: accountsResult.error
      ? []
      : ((accountsResult.data ?? []) as AccountRow[]).map(accountFromRow),
    isAdmin: adminResult.error ? false : Boolean(adminResult.data),
  };
}
