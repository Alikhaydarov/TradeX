import { serverError, unauthorized } from "@/lib/backend/auth";
import { runMt5SyncQueue } from "@/lib/backend/mt5-sync-worker";

export const runtime = "nodejs";

function hasWorkerSecret(request: Request) {
  const expected = process.env.MT5_CONNECTOR_SECRET;
  const header = request.headers.get("authorization") || "";
  return Boolean(expected && header === `Bearer ${expected}`);
}

export async function POST(request: Request) {
  if (!hasWorkerSecret(request)) return unauthorized();

  try {
    const body = await request.json().catch(() => ({})) as { limit?: unknown };
    const limit = Math.max(1, Math.min(25, Number(body.limit || 10)));
    return Response.json(await runMt5SyncQueue(limit));
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "MT5 queue worker failed.");
  }
}

export async function GET(request: Request) {
  if (!hasWorkerSecret(request)) return unauthorized();
  try {
    return Response.json(await runMt5SyncQueue(10));
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "MT5 queue worker failed.");
  }
}
