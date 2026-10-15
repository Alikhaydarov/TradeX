import { notFound } from "next/navigation";
import { AccountSettings } from "@/components/account-settings";
import { hasPaidAccess } from "@/lib/paid-access";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/workspace-bootstrap";
import { isMt5BridgeConfigured } from "@/lib/mt5-bridge";

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getViewer()]);
  if (!user || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [accountResult, paid, connectionResult] = await Promise.all([
    supabase.from("prop_accounts").select("id,name,firm,platform,market_type,account_type,account_size,initial_balance,status")
      .eq("id", id).eq("user_id", user.id).maybeSingle(),
    hasPaidAccess(supabase, user.id),
    supabase.from("trading_accounts").select("id,account_login,broker_server,status,last_error,last_synced_at")
      .eq("prop_account_id", id).eq("user_id", user.id).eq("platform", "MT5").maybeSingle(),
  ]);
  if (!accountResult.data) notFound();
  return <AccountSettings account={accountResult.data} paid={paid} connection={connectionResult.data} bridgeConfigured={isMt5BridgeConfigured()} />;
}
