const mt5ApiBaseUrl = (process.env.MT5_API_URL || "").replace(/\/$/, "");

export function isMt5ApiConfigured() {
  return Boolean(mt5ApiBaseUrl);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!mt5ApiBaseUrl) throw new Error("MT5_API_URL is not configured.");
  const response = await fetch(`${mt5ApiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const payload = await response.json().catch(() => null) as { error?: string; detail?: string; message?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || payload?.detail || payload?.message || `MT5 API request failed (${response.status}).`);
  }
  return payload as T;
}

export function connectMt5Api(input: {
  login: string;
  password: string;
  server: string;
  userId: string;
  accountId?: string;
  propAccountId?: string;
}) {
  return request<{ success?: boolean; message?: string; account?: unknown }>("/connect", {
    method: "POST",
    body: JSON.stringify({
      login: input.login,
      password: input.password,
      server: input.server,
      user_id: input.userId,
      account_id: input.accountId,
      prop_account_id: input.propAccountId,
    }),
  });
}

export function syncNowMt5Api(input?: { userId?: string; accountId?: string; propAccountId?: string }) {
  return request<{ success?: boolean; imported?: number; total?: number; message?: string }>("/sync-now", {
    method: "POST",
    body: JSON.stringify({
      user_id: input?.userId,
      account_id: input?.accountId,
      prop_account_id: input?.propAccountId,
    }),
  });
}

export function getMt5ApiStatus() {
  return request<unknown>("/status");
}
