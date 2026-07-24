import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { getPremiumStatus } from "@/lib/backend/premium";
import {
  buildTradovateAuthorizationUrl,
  createTradovateOAuthState,
} from "@/lib/backend/tradovate";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const premium = await getPremiumStatus(auth);
  if (!premium.isPremium) {
    return Response.json(
      {
        error: "Tradovate connection is available on Standard and Pro plans.",
        upgradeUrl: "/pricing",
      },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const { data: account, error } = await auth.supabase
    .from("prop_accounts")
    .select("id, platform, import_source")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) return serverError(error.message);
  if (!account) return badRequest("Account not found.");

  const platform = String(account.platform || "").toLowerCase();
  const importSource = String(account.import_source || "").toLowerCase();
  if (platform !== "tradovate" && importSource !== "tradovate") {
    return badRequest("This account is not configured for Tradovate.");
  }

  try {
    const state = createTradovateOAuthState(auth.user.id, id);
    return Response.json({ url: buildTradovateAuthorizationUrl(state) });
  } catch (connectError) {
    return badRequest(
      connectError instanceof Error
        ? connectError.message
        : "Tradovate OAuth is not configured.",
    );
  }
}
