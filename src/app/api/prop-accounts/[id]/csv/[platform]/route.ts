import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import {
  parsePlatformCsvToJournalRows,
  type CsvImportPlatform,
} from "@/lib/server/platform-csv";

export const runtime = "nodejs";

const SUPPORTED_PLATFORMS = new Set<CsvImportPlatform>([
  "ninjatrader",
  "matchtrader",
  "projectx",
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; platform: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { id, platform: rawPlatform } = await context.params;
  const platform = rawPlatform.toLowerCase() as CsvImportPlatform;
  if (!SUPPORTED_PLATFORMS.has(platform)) return badRequest("Unsupported CSV platform.");

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return badRequest("CSV file is required.");
  if (file.size <= 0) return badRequest("The selected CSV file is empty.");
  if (file.size > 10 * 1024 * 1024) return badRequest("CSV file must be 10 MB or smaller.");

  const { data: account, error: accountError } = await auth.supabase
    .from("prop_accounts")
    .select("id, name, platform, import_source, market_type, account_size, profit_target, max_drawdown")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (accountError) return serverError(accountError.message);
  if (!account) return badRequest("Account not found.");

  const accountPlatform = String(account.platform || "").toLowerCase();
  const importSource = String(account.import_source || "").toLowerCase();
  if (accountPlatform !== platform && importSource !== platform) {
    return badRequest(`This account is not configured for ${platform} CSV import.`);
  }

  const text = await file.text();
  const parsed = parsePlatformCsvToJournalRows({
    platform,
    text,
    userId: auth.user.id,
    account,
  });

  if (!parsed.rows.length) {
    return badRequest(
      `No valid closed ${platform} trades were found. Export a closed-trade report with symbol, entry, exit, quantity, close time and PNL columns.`,
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
  return Response.json({
    platform,
    imported,
    scanned: parsed.scanned,
    skipped: parsed.skipped,
    duplicates: Math.max(0, parsed.rows.length - imported),
  });
}
