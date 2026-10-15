import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";
import { hasPaidAccess } from "@/lib/paid-access";
import { parsePlatformCsvToJournalRows, type CsvImportPlatform } from "@/lib/platform-csv";

export const runtime = "nodejs";
const platforms = new Set<CsvImportPlatform>(["tradovate", "ninjatrader", "projectx", "ctrader", "matchtrader"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getRouteAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await hasPaidAccess(auth.supabase, auth.user.id))) return NextResponse.json({ error: "CSV import requires Standard or Pro." }, { status: 403 });
  const { id } = await context.params;
  const { data: account, error: accountError } = await auth.supabase.from("prop_accounts")
    .select("id,name,platform,market_type,account_size,profit_target,max_drawdown")
    .eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  if (accountError) return NextResponse.json({ error: "Account could not be loaded." }, { status: 500 });
  if (!account) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  const platform = String(account.platform || "").toLowerCase() as CsvImportPlatform;
  if (!platforms.has(platform)) return NextResponse.json({ error: "This account does not support CSV import." }, { status: 400 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024 || !/\.csv$/i.test(file.name))
    return NextResponse.json({ error: "Choose a CSV file smaller than 10 MB." }, { status: 400 });
  const parsed = parsePlatformCsvToJournalRows({ platform, text: await file.text(), userId: auth.user.id, account });
  if (!parsed.rows.length) return NextResponse.json({ error: "No valid closed trades found. Check the CSV columns and platform export format." }, { status: 400 });
  const { data, error } = await auth.supabase.from("journal_entries")
    .upsert(parsed.rows, { onConflict: "user_id,external_source,external_id", ignoreDuplicates: true }).select("id");
  if (error) return NextResponse.json({ error: "Trades could not be imported." }, { status: 500 });
  return NextResponse.json({ imported: data?.length ?? 0, scanned: parsed.scanned, skipped: parsed.skipped, duplicates: Math.max(0, parsed.rows.length - (data?.length ?? 0)) });
}
