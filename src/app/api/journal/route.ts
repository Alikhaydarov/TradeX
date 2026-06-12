import {
  authenticateRequest,
  badRequest,
  serverError,
  unauthorized,
} from "@/lib/backend/auth";

export const runtime = "nodejs";

interface JournalPayload {
  symbol?: string;
  side?: "Long" | "Short";
  entry?: number;
  exit?: number;
  quantity?: number;
  fees?: number;
  note?: string;
  tradedAt?: string;
  accountName?: string;
  marketType?: string;
  setup?: string;
  emotion?: string;
  riskAmount?: number;
  imageUrl?: string | null;
  tags?: string[];
  accountSize?: number;
  profitTarget?: number;
  maxDrawdown?: number;
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { data, error } = await auth.supabase
    .from("journal_entries")
    .select("*")
    .order("traded_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return serverError(error.message);
  return Response.json({ entries: data });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = (await request.json()) as JournalPayload;
  const symbol = body.symbol?.trim().toUpperCase();
  const side = body.side;
  const entry = Number(body.entry);
  const exit = Number(body.exit);
  const quantity = Number(body.quantity ?? 1);
  const fees = Number(body.fees ?? 0);
  const riskAmount = Number(body.riskAmount ?? 0);
  const accountSize = Number(body.accountSize ?? 0);
  const profitTarget = Number(body.profitTarget ?? 0);
  const maxDrawdown = Number(body.maxDrawdown ?? 0);

  if (!symbol || !side || !["Long", "Short"].includes(side)) {
    return badRequest("Symbol va yo'nalishni to'g'ri kiriting.");
  }
  if (![entry, exit, quantity, fees, riskAmount, accountSize, profitTarget, maxDrawdown].every(Number.isFinite) || entry <= 0 || exit <= 0 || quantity <= 0 || fees < 0 || riskAmount < 0 || accountSize < 0 || profitTarget < 0 || maxDrawdown < 0) {
    return badRequest("Narx, miqdor va komissiya qiymatlarini tekshiring.");
  }

  const gross = side === "Long" ? (exit - entry) * quantity : (entry - exit) * quantity;
  const pnl = Number((gross - fees).toFixed(2));
  const resultR = riskAmount > 0 ? Number((pnl / riskAmount).toFixed(2)) : 0;
  const { data, error } = await auth.supabase
    .from("journal_entries")
    .insert({
      user_id: auth.user.id,
      symbol,
      side,
      entry_price: entry,
      exit_price: exit,
      quantity,
      fees,
      pnl,
      note: body.note?.trim().slice(0, 500) ?? "",
      traded_at: body.tradedAt || new Date().toISOString().slice(0, 10),
      account_name: body.accountName?.trim().slice(0, 80) || "Main account",
      market_type: body.marketType?.trim().slice(0, 30) || "CFD",
      setup: body.setup?.trim().slice(0, 80) ?? "",
      emotion: body.emotion?.trim().slice(0, 30) || "Neutral",
      risk_amount: riskAmount,
      result_r: resultR,
      account_size: accountSize,
      profit_target: profitTarget,
      max_drawdown: maxDrawdown,
      image_url: body.imageUrl?.trim().slice(0, 1000) || null,
      tags: (body.tags ?? []).map((tag) => tag.trim().slice(0, 24)).filter(Boolean).slice(0, 8),
    })
    .select()
    .single();

  if (error) return serverError(error.message);
  return Response.json({ entry: data }, { status: 201 });
}
