import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { requirePremium } from "@/lib/backend/premium";
import { rateLimitOrResponse } from "@/lib/backend/request-security";
import { buildAiCoachReport, mapJournalTrade } from "@/lib/backend/trade-ai-coach";

export const runtime = "nodejs";

async function handleTradeReport(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  try {
    const locked = await requirePremium(auth);
    if (locked) return locked;

    // This route reaches an external LLM, so an unbounded caller is a billing
    // problem, not just a load problem. Same shape as /api/ai/chat: a short
    // burst window plus a longer one.
    const burst = await rateLimitOrResponse(auth, "tradox-ai-report-burst", 1, 20);
    if (burst) return burst;
    const window = await rateLimitOrResponse(auth, "tradox-ai-report-window", 10, 3600);
    if (window) return window;

    const url = new URL(request.url);
    const accountId = url.searchParams.get("accountId");
    if (!accountId) return Response.json({ error: "accountId is required." }, { status: 400 });

    const { data: account, error: accountError } = await auth.supabase
      .from("prop_accounts")
      .select("id")
      .eq("id", accountId)
      .eq("user_id", auth.user.id)
      .single();
    if (accountError || !account) return Response.json({ error: "Trading account not found." }, { status: 404 });

    const { data: rows, error } = await auth.supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("prop_account_id", accountId)
      .order("traded_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(120);
    if (error) return serverError(error.message);

    const report = await buildAiCoachReport((rows || []).map((row) => mapJournalTrade(row as Record<string, unknown>)));
    void auth.supabase.from("ai_reports").insert({
      user_id: auth.user.id,
      account_id: accountId,
      report_type: "trade_coach",
      content: JSON.stringify(report),
      metadata: { trades: rows?.length || 0, generatedBy: report.generatedBy },
    });

    return Response.json({ report });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}

export async function GET(request: Request) {
  return handleTradeReport(request);
}

export async function POST(request: Request) {
  return handleTradeReport(request);
}
