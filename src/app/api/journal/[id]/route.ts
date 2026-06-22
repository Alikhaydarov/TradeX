import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

interface JournalUpdatePayload {
  symbol?: string;
  side?: "Long" | "Short";
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { id } = await context.params;
  const body = (await request.json()) as JournalUpdatePayload;
  const symbol = body.symbol?.trim().toUpperCase();
  const side = body.side;
  const pnl = Number(body.pnl ?? 0);
  const quantity = Number(body.quantity ?? 1);
  const fees = Number(body.fees ?? 0);
  const risk = Number(body.riskAmount ?? 0);
  const resultR = Number(body.resultR ?? 0);

  if (!symbol || !side || !Number.isFinite(pnl) || !Number.isFinite(quantity) || quantity <= 0 || fees < 0 || risk < 0) {
    return badRequest("Trade ma'lumotlarini tekshiring.");
  }

  const gross = pnl + fees;
  const factor = gross / quantity;
  const entry = Math.max(100.0, Math.ceil(Math.abs(factor)) + 100.0);
  const exit = side === "Long" ? entry + factor : entry - factor;

  const baseUpdate = {
    symbol,
    side,
    entry_price: entry,
    exit_price: exit,
    quantity,
    fees,
    pnl,
    note: body.note?.trim().slice(0, 500) || "",
    traded_at: body.tradedAt || new Date().toISOString().slice(0, 10),
    setup: body.setup?.trim().slice(0, 80) || "",
    risk_amount: risk,
    result_r: resultR,
    image_url: Array.isArray(body.imageUrls) && body.imageUrls.length
      ? JSON.stringify(body.imageUrls.map((url) => url.trim().slice(0, 1000)).filter(Boolean).slice(0, 3))
      : body.imageUrl?.trim().slice(0, 1000) || null,
    tags: (body.tags || []).map((tag) => tag.trim().slice(0, 24)).filter(Boolean).slice(0, 8),
  };

  const notionUpdate = {
    risk_percent: body.riskPercent?.trim().slice(0, 10) ?? "",
    session: body.session?.trim().slice(0, 40) || "",
    following_plan: body.followingPlan ?? true,
    error_made: body.errorMade ?? false,
    mistake_type: body.mistakeType?.trim().slice(0, 60) || "",
    review_completed: body.reviewCompleted ?? false,
    to_trading_bible: body.toTradingBible ?? false,
  };

  const updateEntry = (values: Record<string, unknown>) => auth.supabase
    .from("journal_entries")
    .update(values)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select()
    .single();

  let { data, error } = await updateEntry({ ...baseUpdate, ...notionUpdate });
  if (error && (error.code === "42703" || error.code === "PGRST204" || /column|schema cache/i.test(error.message))) {
    const fallback = await updateEntry(baseUpdate);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return serverError(error.message);
  return Response.json({ entry: data });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { id } = await context.params;
  const { error } = await auth.supabase
    .from("journal_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) return serverError(error.message);
  return Response.json({ ok: true });
}
