import { AccountManager } from "@/components/account-manager";
import { loadAccountSummaries } from "@/lib/account-summaries";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace-bootstrap";

export default async function AccountsPage() {
  const { user } = await getWorkspaceBootstrap();
  if (!user) return <AccountManager />;
  const supabase = await createClient();
  try {
    const accounts = await loadAccountSummaries(supabase, user.id);
    return <AccountManager initialAccounts={accounts} />;
  } catch {
    return <AccountManager />;
  }
}
