import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { encryptSecret } from "@/lib/backend/crypto";
import { requirePremium } from "@/lib/backend/premium";

export const runtime = "nodejs";

interface TradingAccountRow {
  id: string;
  platform: string;
  broker_server: string | null;
  account_login: string | null;
  password_type: string | null;
  status: string | null;
  sync_mode: string | null;
  auto_sync_enabled: boolean | null;
  last_synced_at: string | null;
  created_at: string | null;
  prop_account_id?: string | null;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  try {
    const locked = await requirePremium(auth);
    if (locked) return locked;

    const body = await request.json() as {
      brokerServer?: unknown;
      accountLogin?: unknown;
      investorPassword?: unknown;
      propAccountId?: unknown;
    };
    const brokerServer = cleanString(body.brokerServer);
    const accountLogin = cleanString(body.accountLogin);
    const investorPassword = cleanString(body.investorPassword);
    const propAccountId = cleanString(body.propAccountId);

    if (!brokerServer || !accountLogin || !investorPassword) {
      return badRequest("Broker server, account login and investor password are required.");
    }

    if (propAccountId) {
      const { error: propError } = await auth.supabase
        .from("prop_accounts")
        .select("id")
        .eq("id", propAccountId)
        .eq("user_id", auth.user.id)
        .single();
      if (propError) return badRequest("Selected account was not found.");
    }

    let encryptedPassword: string;
    try {
      encryptedPassword = encryptSecret(investorPassword);
    } catch (error) {
      return serverError(error instanceof Error ? error.message : "Connector encryption failed.");
    }

    const { data, error } = await auth.supabase
      .from("trading_accounts")
      .upsert({
        user_id: auth.user.id,
        platform: "MT5",
        broker_server: brokerServer.slice(0, 160),
        account_login: accountLogin.slice(0, 80),
        prop_account_id: propAccountId || null,
        encrypted_password: encryptedPassword,
        password_type: "investor",
        status: "pending",
        last_error: null,
        sync_mode: "normal",
        auto_sync_enabled: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,platform,broker_server,account_login" })
      .select("id, platform, broker_server, account_login, prop_account_id, password_type, status, sync_mode, auto_sync_enabled, last_synced_at, created_at")
      .single<TradingAccountRow>();

    if (error) return serverError(error.message);

    return Response.json({ account: data }, { status: 201 });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
