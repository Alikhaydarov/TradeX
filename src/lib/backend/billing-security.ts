import { getAppUrl } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

export function isTrustedBillingOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(getAppUrl(request)).origin;
  } catch {
    return false;
  }
}

function consumeLocalBillingAttempt(userId: string) {
  const now = Date.now();
  const current = attempts.get(userId);
  if (!current || current.resetAt <= now) {
    attempts.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  current.count += 1;
  if (attempts.size > 5_000) {
    for (const [key, value] of attempts) {
      if (value.resetAt <= now) attempts.delete(key);
    }
  }
  return current.count <= MAX_ATTEMPTS;
}

export async function consumeBillingAttempt(userId: string) {
  const admin = getSupabaseAdminClient();
  if (!admin) return false;

  const { data, error } = await admin.rpc("consume_billing_rate_limit", {
    target_key: `billing:${userId}`,
    request_limit: MAX_ATTEMPTS,
    window_seconds: WINDOW_MS / 1_000,
  });

  if (error) {
    console.error("Global billing rate-limit failed", error);
    return false;
  }

  // Keep a cheap per-instance guard to absorb bursts before another DB round trip.
  return data === true && consumeLocalBillingAttempt(userId);
}

export function billingSecurityError(message: string, status: number) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
