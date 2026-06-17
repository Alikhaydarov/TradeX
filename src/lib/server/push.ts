import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 90; // Expo accepts up to 100 messages per request.

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoTicket {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

async function sendExpoPush(tokens: string[], payload: PushPayload) {
  if (!tokens.length) return;

  for (const batch of chunk(tokens, EXPO_BATCH_SIZE)) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(
          batch.map((token) => ({
            to: token,
            title: payload.title,
            body: payload.body,
            data: payload.data ?? {},
            sound: "default",
            priority: "high",
          })),
        ),
      });

      if (!response.ok) continue;

      const result = (await response.json()) as { data?: ExpoTicket[] };
      const tickets = result.data ?? [];
      const deadTokens: string[] = [];

      tickets.forEach((ticket, index) => {
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          deadTokens.push(batch[index]);
        }
      });

      if (deadTokens.length) await removeDeadTokens(deadTokens);
    } catch {
      // Push delivery is best-effort; it should never break the API route that triggered it.
    }
  }
}

async function removeDeadTokens(tokens: string[]) {
  const admin = getSupabaseAdminClient();
  if (!admin) return;
  await admin.from("push_tokens").delete().in("token", tokens).then(
    () => undefined,
    () => undefined,
  );
}

/**
 * Sends a push notification to every registered device of the given users.
 * Safe to call even if push isn't configured (service role missing) or the
 * users have no registered devices — it silently becomes a no-op.
 */
export async function notifyUsers(userIds: string[], payload: PushPayload) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueIds.length) return;

  const admin = getSupabaseAdminClient();
  if (!admin) return;

  const { data, error } = await admin
    .from("push_tokens")
    .select("token")
    .in("user_id", uniqueIds);

  if (error || !data?.length) return;

  const tokens = Array.from(new Set(data.map((row) => row.token as string)));
  await sendExpoPush(tokens, payload);
}
