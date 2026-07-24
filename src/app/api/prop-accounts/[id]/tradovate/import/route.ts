import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { parseTradovateCsvToJournalRows } from "@/lib/server/tradovate-csv";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { id } = await context.params;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) return badRequest("Tradovate CSV file is required.");
  if (file.size <= 0) return badRequest("The selected Tradovate CSV file is empty.");
  if (file.size > MAX_FILE_SIZE) return badRequest("Tradovate CSV must be smaller than 10 MB.");

  const { data: account, error: accountError } = await auth.supabase
    .from("prop_accounts")
    .select("id, name, platform, import_source, market_type, account_size, profit_target, max_drawdown")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (accountError) return serverError(accountError.message);
  if (!account) return badRequest("Account not found.");

  const platform = String(account.platform || "").toLowerCase();
  const importSource = String(account.import_source || "").toLowerCase();
  if (platform !== "tradovate" && importSource !== "tradovate") {
    return badRequest("Select a Tradovate account before importing this report.");
  }

  const text = await file.text();
  const parsed = parseTradovateCsvToJournalRows({
    text,
    userId: auth.user.id,
    account,
  });

  if (!parsed.rows.length) {
    return badRequest(
      "No closed Tradovate positions were recognized. Export Reports → Position History as CSV and make sure the report includes Contract, timestamps and P/L columns.",
    );
  }

  const { data, error } = await auth.supabase
    .from("journal_entries")
    .upsert(parsed.rows, {
      onConflict: "user_id,external_source,external_id",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) return serverError(error.message);

  const imported = data?.length || 0;
  await auth.supabase
    .from("prop_accounts")
    .update({ status: "Active", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", auth.user.id);

  return Response.json({
    imported,
    scanned: parsed.scanned,
    skipped: parsed.skipped,
    duplicates: Math.max(0, parsed.rows.length - imported),
  });
}
