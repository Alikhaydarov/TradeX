import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { parseTradovatePositionHistoryCsv } from "@/lib/server/tradovate-position-history-csv";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function decodeCsv(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes);
  }

  const sample = bytes.slice(0, Math.min(bytes.length, 400));
  let evenZeroes = 0;
  let oddZeroes = 0;
  for (let index = 0; index < sample.length; index += 1) {
    if (sample[index] !== 0) continue;
    if (index % 2 === 0) evenZeroes += 1;
    else oddZeroes += 1;
  }

  if (oddZeroes > sample.length * 0.12) return new TextDecoder("utf-16le").decode(bytes);
  if (evenZeroes > sample.length * 0.12) return new TextDecoder("utf-16be").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes);
}

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

  const text = await decodeCsv(file);
  const parsed = parseTradovatePositionHistoryCsv({
    text,
    userId: auth.user.id,
    account,
  });

  if (!parsed.rows.length) {
    const headerNote = parsed.headerRows > 0
      ? `Header was found, but ${parsed.skipped} data rows were invalid.`
      : "The trade-table header was not found inside the file.";
    return badRequest(
      `No closed Tradovate positions were recognized. ${headerNote} Export Reports → Position History as CSV with Contract, Paired Qty, Pair ID, Buy Price, Sell Price, Trade Date and P/L columns.`,
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
  const databaseDuplicates = Math.max(0, parsed.rows.length - imported);

  await auth.supabase
    .from("prop_accounts")
    .update({ status: "Active", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", auth.user.id);

  return Response.json({
    imported,
    scanned: parsed.scanned,
    skipped: parsed.skipped,
    duplicates: parsed.duplicateRows + databaseDuplicates,
    fileDuplicates: parsed.duplicateRows,
    databaseDuplicates,
    headerRows: parsed.headerRows,
  });
}
