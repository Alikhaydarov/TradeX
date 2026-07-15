import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface JournalPayload {
  propAccountId?: string;
  symbol?: string;
  side?: "Long" | "Short";
  entry?: number;
  exit?: number;
  pnl?: number;
  quantity?: number;
  fees?: number;
  note?: string;
  tradedAt?: string;
  setup?: string;
  riskAmount?: number;
  resultR?: number;
  riskPercent?: string;
  session?: string;
  followingPlan?: boolean;
  errorMade?: boolean;
  mistakeType?: string;
  reviewCompleted?: boolean;
  toTradingBible?: boolean;
  imageUrl?: string | null;
  imageUrls?: string[];
  tags?: string[];
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const accountId = new URL(request.url).searchParams.get("accountId");

  let versionQuery = auth.supabase
    .from("journal_entries")
    .select("updated_at", { count: "exact" })
    .eq("user_id", auth.user.id)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (accountId) versionQuery = versionQuery.eq("prop_account_id", accountId);

  const { data: versionRows, count, error: versionError } = await versionQuery;
  if (versionError) return serverError(versionError.message);

  const latestUpdatedAt = versionRows?.[0]?.updated_at ?? "empty";
  const etag = `W/\"${accountId ?? "all"}:${count ?? 0}:${latestUpdatedAt}\"`;
  const headers = {
    "Cache-Control": "private, no-cache, must-revalidate",
    ETag: etag,
  };

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }

  let query = auth.supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("traded_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (accountId) query = query.eq("prop_account_id", accountId);
  const { data, error } = await query;
  if (error) return serverError(error.message);
  return Response.json({ entries: data }, { headers });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = (await request.json()) as JournalPayload;
  if (!body.propAccountId) return badRequest("Select a trading account.");

  const { data: account, error: accountError } = await auth.supabase
    .from("prop_accounts")
    .select("*")
    .eq("id", body.propAccountId)
    .eq("user_id", auth.user.id)
    .single();
  if (accountError || !account) return badRequest("Trading account not found.");

  const symbol = body.symbol?.trim().toUpperCase();
  const side = body.side;
  const quantity = Number(body.quantity || 1);
  const fees = Number(body.fees || 0);
  const risk = Number(body.riskAmount || 0);
  const resultR = Number(body.resultR || 0);

  let pnl = 0;
  let entry = 0;
  let exit = 0;

  if (body.pnl !== undefined) {
    pnl = Number(body.pnl);
    const gross = pnl + fees;
    const factor = gross / quantity;
    entry = Math.max(100.0, Math.ceil(Math.abs(factor)) + 100.0);
    exit = side === "Long" ? entry + factor : entry - factor;
  } else {
    entry = Number(body.entry);
    exit = Number(body.exit);
    const gross = side === "Long" ? (exit - entry) * quantity : (entry - exit) * quantity;
    pnl = Number((gross - fees).toFixed(2));
  }

  if (
    !symbol || !side ||
    ![entry, exit, quantity, fees, risk].every(Number.isFinite) ||
    entry <= 0 || exit <= 0 || quantity <= 0 || fees < 0 || risk < 0
  ) {
    return badRequest("Trade ma'lumotlarini tekshiring.");
  }

  const baseEntry = {
    user_id: auth.user.id,
    prop_account_id: account.id,
    symbol,
    side,
    entry_price: entry,
    exit_price: exit,
    quantity,
    fees,
    pnl,
    note: body.note?.trim().slice(0, 500) || "",
    traded_at: body.tradedAt || new Date().toISOString().slice(0, 10),
    account_name: account.name,
    market_type: account.market_type,
    setup: body.setup?.trim().slice(0, 80) || "",
    risk_amount: risk,
    result_r: resultR,
    account_size: account.account_size,
    profit_target: account.profit_target,
    max_drawdown: account.max_drawdown,
    image_url: Array.isArray(body.imageUrls) && body.imageUrls.length
      ? JSON.stringify(body.imageUrls.map((url) => url.trim().slice(0, 1000)).filter(Boolean).slice(0, 3))
      : body.imageUrl?.trim().slice(0, 1000) || null,
    tags: (body.tags || []).map((t) => t.trim().slice(0, 24)).filter(Boolean).slice(0, 8),
  };

  const notionFields = {
    risk_percent: body.riskPercent?.trim().slice(0, 10) ?? "",
    session: body.session?.trim().slice(0, 40) || "",
    following_plan: body.followingPlan ?? true,
    error_made: body.errorMade ?? false,
    mistake_type: body.mistakeType?.trim().slice(0, 60) || "",
    review_completed: body.reviewCompleted ?? false,
    to_trading_bible: body.toTradingBible ?? false,
  };

  const insertEntry = (entry: Record<string, unknown>) => auth.supabase
    .from("journal_entries")
    .insert(entry)
    .select()
    .single();

  let { data, error } = await insertEntry({ ...baseEntry, ...notionFields });

  if (error && (error.code === "42703" || error.code === "PGRST204" || /column|schema cache/i.test(error.message))) {
    const fallback = await insertEntry(baseEntry);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return serverError(error.message);
  return Response.json({ entry: data }, { status: 201 });
}
