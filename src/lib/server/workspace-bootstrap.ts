import type { PropAccount } from "@/components/types";
import { accountFromRow, type AccountRow } from "@/lib/workspace-accounts";
import { journalEntryFromRow, type JournalEntryRow } from "@/lib/journal-entry";
import type { JournalEntry } from "@/components/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface WorkspaceBootstrap {
  accounts: PropAccount[];
  isAdmin: boolean;
  /**
   * Every journal entry for this user, newest first. The client slices this per
   * account, so one server query seeds both the per-account workspace views and
   * the all-accounts journal view.
   */
  journalEntries: JournalEntry[];
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
const JOURNAL_BOOTSTRAP_LIMIT = 500;

export async function getWorkspaceBootstrap(): Promise<WorkspaceBootstrap> {
  const empty: WorkspaceBootstrap = { accounts: [], isAdmin: false, journalEntries: [] };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return empty;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return empty;

  const [accountsResult, adminResult, journalResult] = await Promise.all([
    supabase
      .from("prop_accounts")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("is_admin"),
    supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("traded_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(JOURNAL_BOOTSTRAP_LIMIT),
  ]);

  return {
    accounts: accountsResult.error
      ? []
      : ((accountsResult.data ?? []) as AccountRow[]).map(accountFromRow),
    isAdmin: adminResult.error ? false : Boolean(adminResult.data),
    journalEntries: journalResult.error
      ? []
      : ((journalResult.data ?? []) as JournalEntryRow[]).map(journalEntryFromRow),
  };
}
