import { AccountManager } from "@/components/account-manager";
import { loadAccountSummaries } from "@/lib/account-summaries";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace-bootstrap";
import { hasPaidAccess } from "@/lib/paid-access";

export default async function AccountsPage() {
  const { user } = await getWorkspaceBootstrap();
  if (!user) return <AccountManager />;
  const supabase = await createClient();
  try {
    const [accounts, paid] = await Promise.all([loadAccountSummaries(supabase, user.id), hasPaidAccess(supabase, user.id)]);
    return <AccountManager initialAccounts={accounts} paid={paid} />;
  } catch {
    return <AccountManager />;
  }
}
