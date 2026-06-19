import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

function values(body: Record<string, unknown>) {
  const name = String(body.name || "").trim().slice(0, 80);
  const accountSize = Number(body.accountSize);
  const initialBalance = Number(body.initialBalance || accountSize);
  const profitTarget = Number(body.profitTarget || 0);
  const maxDrawdown = Number(body.maxDrawdown || 0);
  const dailyDrawdown = Number(body.dailyDrawdown || 0);
  if (!name || ![accountSize, initialBalance, profitTarget, maxDrawdown, dailyDrawdown].every(Number.isFinite) || accountSize <= 0 || initialBalance <= 0) return null;
  return { name, firm: String(body.firm || "").trim().slice(0,80), phase: String(body.phase || "Challenge").slice(0,40), market_type: String(body.marketType || "CFD").slice(0,30), account_size: accountSize, initial_balance: initialBalance, profit_target: Math.max(0,profitTarget), max_drawdown: Math.max(0,maxDrawdown), daily_drawdown: Math.max(0,dailyDrawdown), start_date: body.startDate || new Date().toISOString().slice(0,10), status: body.status || "Active", updated_at: new Date().toISOString() };
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request); if (!auth) return unauthorized();
  const { data, error } = await auth.supabase.from("prop_accounts").select("*").eq("user_id",auth.user.id).order("created_at",{ascending:false});
  if (error) return serverError(error.message); return Response.json({accounts:data});
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request); if (!auth) return unauthorized();
  const payload = values(await request.json()); if (!payload) return badRequest("Account ma'lumotlarini tekshiring.");
  const { data, error } = await auth.supabase.from("prop_accounts").insert({...payload,user_id:auth.user.id}).select().single();
  if (error) return serverError(error.message); return Response.json({account:data},{status:201});
}
