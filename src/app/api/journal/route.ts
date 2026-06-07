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

  if (!symbol || !side || !["Long", "Short"].includes(side)) {
    return badRequest("Symbol va yo'nalishni to'g'ri kiriting.");
  }
  if (![entry, exit, quantity, fees].every(Number.isFinite) || entry <= 0 || exit <= 0 || quantity <= 0 || fees < 0) {
    return badRequest("Narx, miqdor va komissiya qiymatlarini tekshiring.");
  }

  const gross = side === "Long" ? (exit - entry) * quantity : (entry - exit) * quantity;
  const pnl = Number((gross - fees).toFixed(2));
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
    })
    .select()
    .single();

  if (error) return serverError(error.message);
  return Response.json({ entry: data }, { status: 201 });
}

