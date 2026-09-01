import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type MemoryWindow = { count: number; resetAt: number };

const memoryWindows = new Map<string, MemoryWindow>();

function consumeMemoryWindow(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const current = memoryWindows.get(key);

  if (!current || current.resetAt <= now) {
    memoryWindows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    if (memoryWindows.size > 5_000) {
      for (const [entryKey, entry] of memoryWindows) {
        if (entry.resetAt <= now) memoryWindows.delete(entryKey);
      }
    }
    return true;
  }

  current.count += 1;
  return current.count <= limit;
}

/**
 * A fixed-window counter shared by every server instance.
 *
 * Serverless makes per-process `Map` throttles decorative: each cold lambda
 * starts with an empty map, so a caller only has to spread requests across
 * instances to bypass them. This leans on the same `billing_rate_limits` table
 * the billing guard uses - one row per key, incremented atomically in Postgres -
 * so the limit means the same thing no matter which instance answers.
 *
 * Use it for limits that cannot be keyed to an authenticated user (sign-in
 * attempts by IP) or that must hold across instances (external-API cooldowns).
 *
 * If the shared counter is unreachable it degrades to a per-instance window
 * rather than refusing. Failing closed here would mean one network blip locks
 * every user out of sign-in, which is a worse outcome than a rate limit that is
 * temporarily only as strong as the number of running instances.
 */
export async function consumeSharedLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const safeWindow = Math.max(1, Math.min(3600, Math.floor(windowSeconds)));
  // The SQL function rejects keys outside 8..200 characters.
  const safeKey = key.slice(0, 200).padEnd(8, "_");

  const admin = getSupabaseAdminClient();
  if (admin) {
    try {
      const { data, error } = await admin.rpc("consume_billing_rate_limit", {
        target_key: safeKey,
        request_limit: safeLimit,
        window_seconds: safeWindow,
      });
      if (!error) return data === true;
      console.error("Shared rate limit rejected", error.message);
    } catch (error) {
      console.error(
        "Shared rate limit unreachable",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return consumeMemoryWindow(safeKey, safeLimit, safeWindow);
}

/**
 * Best-effort client address, used only as a rate-limit key.
 *
 * Behind Vercel the left-most `x-forwarded-for` entry is the real client. It is
 * spoofable in principle, which is why this is never used for authorization -
 * only to make a brute-force attempt cost the attacker a distinct address.
 */
export function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}
