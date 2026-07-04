import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import type { ApiAuth } from "@/lib/backend/auth";

export const runtime = "nodejs";

const ACCOUNT_STATUSES = new Set(["Processing", "Active", "Passed", "Failed", "Paused"]);
const DUPLICATE_NAME_PATTERN = /prop_accounts_user_id_name_key|duplicate key value/i;

function values(body: Record<string, unknown>) {
  const name = String(body.name || "").trim().slice(0, 80);
  const accountType = String(body.accountType || "prop").trim() === "real" ? "real" : "prop";
  const importSourceRaw = String(body.importSource || "manual").trim();
  const importSource = ["manual", "mt5_bridge", "ctrader", "tradovate", "ninjatrader", "projectx", "official_api"].includes(importSourceRaw) ? importSourceRaw : "manual";
  const accountSize = Number(body.accountSize);
  const initialBalance = Number(body.initialBalance || accountSize);
  const profitTarget = Number(body.profitTarget || 0);
  const maxDrawdown = Number(body.maxDrawdown || 0);
  const dailyDrawdown = Number(body.dailyDrawdown || 0);
  if (!name || ![accountSize, initialBalance, profitTarget, maxDrawdown, dailyDrawdown].every(Number.isFinite) || accountSize <= 0 || initialBalance <= 0) return null;
  return {
    name,
    account_type: accountType,
    firm: String(body.firm || "").trim().slice(0,80),
    prop_site: String(body.propSite || "").trim().slice(0, 120),
    prop_login: String(body.propLogin || "").trim().slice(0, 120),
    import_source: importSource,
    platform: String(body.platform || "mt5").trim().slice(0, 30),
    phase: String(body.phase || (accountType === "real" ? "Live" : "Challenge")).slice(0,40),
    market_type: String(body.marketType || "CFD").slice(0,30),
    account_size: accountSize,
    initial_balance: initialBalance,
    profit_target: Math.max(0,profitTarget),
    max_drawdown: Math.max(0,maxDrawdown),
    daily_drawdown: Math.max(0,dailyDrawdown),
    start_date: body.startDate || new Date().toISOString().slice(0,10),
    status: ACCOUNT_STATUSES.has(String(body.status || "")) ? String(body.status) : "Active",
    updated_at: new Date().toISOString()
  };
}

async function findUniqueAccountName(auth: ApiAuth, name: string) {
  const { data, error } = await auth.supabase
    .from("prop_accounts")
    .select("name")
    .eq("user_id", auth.user.id)
    .ilike("name", `${name}%`);

  if (error) throw new Error(error.message);

  const existingNames = new Set((data || []).map((item) => String(item.name || "").trim().toLowerCase()));
  if (!existingNames.has(name.toLowerCase())) return name;

  for (let index = 2; index < 200; index += 1) {
    const candidate = `${name} ${index}`;
    if (!existingNames.has(candidate.toLowerCase())) return candidate;
  }

  return `${name} ${Date.now().toString().slice(-4)}`;
}

async function insertPropAccount(auth: ApiAuth, insertPayload: Record<string, unknown>) {
  let payload = { ...insertPayload };
  let attempt = await auth.supabase.from("prop_accounts").insert(payload).select().single();
  if (!attempt.error) return attempt;

  if (DUPLICATE_NAME_PATTERN.test(attempt.error.message)) {
    payload = {
      ...payload,
      name: await findUniqueAccountName(auth, String(insertPayload.name || "Account").trim() || "Account"),
    };
    attempt = await auth.supabase.from("prop_accounts").insert(payload).select().single();
  }

  return attempt;
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request); if (!auth) return unauthorized();
  const { data, error } = await auth.supabase.from("prop_accounts").select("*").eq("user_id",auth.user.id).order("created_at",{ascending:false});
  if (error) return serverError(error.message); return Response.json({accounts:data});
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request); if (!auth) return unauthorized();
  const payload = values(await request.json()); if (!payload) return badRequest("Check account details.");
  const insertPayload = { ...payload, user_id: auth.user.id };
  let { data, error } = await insertPropAccount(auth, insertPayload);
  if (!error) return Response.json({account:data},{status:201});

  if (/prop_accounts_status_check|status.*check constraint/i.test(error.message) && insertPayload.status === "Processing") {
    const retry = await insertPropAccount(auth, { ...insertPayload, status: "Paused" });
    data = retry.data;
    error = retry.error;
    if (!error) return Response.json({account:data},{status:201});
  }

  const schemaIsOld = /account_type|prop_site|prop_login|import_source|platform/i.test(error.message);
  if (!schemaIsOld) return serverError(error.message);

  const { account_type, prop_site, prop_login, import_source, platform, ...legacyPayload } = insertPayload;
  void account_type; void prop_site; void prop_login; void import_source; void platform;
  const fallback = await insertPropAccount(auth, legacyPayload);
  if (fallback.error) return serverError(fallback.error.message);
  return Response.json({account:fallback.data},{status:201});
}
