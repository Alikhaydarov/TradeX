import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

type TraderoxReportRow = {
  id: string;
  discipline_score: number | null;
  stats: Record<string, unknown> | null;
  findings: unknown[] | null;
  created_at: string | null;
};

type TraderoxAlertRow = {
  id: string;
  type: string | null;
  severity: string | null;
  title: string | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

export async function GET(request: Request, context: { params: Promise<{ accountId: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { accountId } = await context.params;

  const { data: account, error: accountError } = await auth.supabase
    .from("trading_accounts")
    .select("id, user_id, prop_account_id")
    .eq("id", accountId)
    .eq("user_id", auth.user.id)
    .maybeSingle<{ id: string; user_id: string; prop_account_id: string | null }>();

  if (accountError) return serverError(accountError.message);
  if (!account) return Response.json({ error: "Trading account not found." }, { status: 404 });

  const { data: report, error: reportError } = await auth.supabase
    .from("traderox_reports")
    .select("id, discipline_score, stats, findings, created_at")
    .eq("account_id", account.id)
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<TraderoxReportRow>();

  if (reportError) return serverError(reportError.message);

  const { data: alerts, error: alertsError } = await auth.supabase
    .from("traderox_alerts")
    .select("id, type, severity, title, message, metadata, created_at")
    .eq("account_id", account.id)
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<TraderoxAlertRow[]>();

  if (alertsError) return serverError(alertsError.message);

  const stats = report?.stats || {};

  return Response.json({
    accountId: account.id,
    report: report ? {
      id: report.id,
      createdAt: report.created_at,
      disciplineScore: Number(report.discipline_score || 0),
      stats,
      findings: report.findings || [],
      recommendations: Array.isArray(stats.recommendations) ? stats.recommendations : [],
      coach: stats.coach || null,
    } : null,
    alerts: alerts || [],
  });
}
