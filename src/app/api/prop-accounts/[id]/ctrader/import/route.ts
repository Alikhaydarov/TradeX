import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { parseCTraderCsvToJournalRows } from "@/lib/server/ctrader-csv";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { id } = await context.params;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) return badRequest("cTrader CSV file is required.");

  const { data: account, error: accountError } = await auth.supabase
    .from("prop_accounts")
    .select("id, name, market_type, account_size, profit_target, max_drawdown")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (accountError) return serverError(accountError.message);
  if (!account) return badRequest("Account not found.");

  const text = await file.text();
  const rows = parseCTraderCsvToJournalRows({ text, userId: auth.user.id, account });

  if (!rows.length) {
    return badRequest("No closed cTrader trades were found in this file. Export closed history/deals as CSV and try again.");
  }

  const { data, error } = await auth.supabase
    .from("journal_entries")
    .upsert(rows, { onConflict: "user_id,external_source,external_id", ignoreDuplicates: true })
    .select("id");

  if (error) return serverError(error.message);

  return Response.json({
    imported: data?.length || 0,
    scanned: rows.length,
  });
}
