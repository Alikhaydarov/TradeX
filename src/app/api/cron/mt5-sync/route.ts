import { serverError, unauthorized } from "@/lib/backend/auth";
import { runMt5SyncQueue } from "@/lib/backend/mt5-sync-worker";

export const runtime = "nodejs";

function hasCronSecret(request: Request) {
  const expected = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") || "";
  return Boolean(expected && header === `Bearer ${expected}`);
}

export async function GET(request: Request) {
  if (!hasCronSecret(request)) return unauthorized();

  try {
    const limit = Math.max(1, Math.min(25, Number(process.env.MT5_SYNC_BATCH_SIZE || 10)));
    return Response.json(await runMt5SyncQueue(limit));
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "MT5 cron sync failed.");
  }
}
