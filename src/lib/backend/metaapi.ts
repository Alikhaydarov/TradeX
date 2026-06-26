import { randomBytes } from "node:crypto";

const PROVISIONING_URL = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";
const CLIENT_URL = "https://mt-client-api-v1.london.agiliumtrade.ai";

export function getMetaApiToken(): string | null {
  return process.env.METAAPI_TOKEN ?? null;
}

interface MetaApiAccountResponse {
  id?: string;
  _id?: string;
  state?: string;
  connectionStatus?: string;
}

interface MetaApiDeal {
  id: string;
  positionId: string;
  symbol: string;
  type: string;           // DEAL_TYPE_BUY | DEAL_TYPE_SELL | DEAL_TYPE_BALANCE
  entryType: string;      // DEAL_ENTRY_IN | DEAL_ENTRY_OUT | DEAL_ENTRY_INOUT
  time: string;           // ISO
  price: number;
  profit: number;
  commission: number;
  volume: number;
  comment?: string;
  magic?: number;
  reason?: string;
  orderId?: string;
}

async function metaApiRequest<T>(url: string, init: RequestInit = {}) {
  const token = getMetaApiToken();
  if (!token) throw new Error("METAAPI_TOKEN not configured.");

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "auth-token": token,
        ...init.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(120000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("MetaAPI connection timed out. Please try again in a minute.");
    }
    throw error;
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const details = Array.isArray(payload?.details)
      ? payload.details.map((item: { message?: string }) => item.message).filter(Boolean).join(" ")
      : "";
    const message = details || payload?.message || payload?.error || `MetaAPI error ${response.status}`;
    throw new Error(formatMetaApiError(String(message), response.status));
  }
  return payload as T;
}

function formatMetaApiError(message: string, status?: number) {
  if (/top up your account/i.test(message) || /account deployment/i.test(message)) {
    return "MetaAPI deployment uchun balans yetarli emas. MetaAPI accountni top up qiling, keyin MT5 connectni qayta bosing.";
  }
  if (status === 404 && /trading account with id .* not found/i.test(message)) {
    return "MetaAPI account yaratildi, lekin deployga hali tayyor emas. 30 soniyadan keyin qayta urinib ko'ring.";
  }
  return message;
}

async function waitForConnection(accountId: string, timeoutMs = 150000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const account = await metaApiRequest<MetaApiAccountResponse>(
      `${PROVISIONING_URL}/users/current/accounts/${encodeURIComponent(accountId)}`,
    );
    if (account.state === "DEPLOYED" && account.connectionStatus === "CONNECTED") return;
    if (account.state === "DEPLOY_FAILED") throw new Error("MetaAPI MT5 accountni deploy qila olmadi. Login, investor password va serverni tekshiring.");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error("MT5 connection timed out. Login, investor password va broker serverni tekshiring.");
}

/** Create, deploy and verify a MetaAPI cloud account for an MT5 account. */
export async function createMetaApiAccount(opts: {
  login: string;
  password: string;
  server: string;
  name: string;
}): Promise<string> {
  const account = await metaApiRequest<MetaApiAccountResponse>(`${PROVISIONING_URL}/users/current/accounts`, {
    method: "POST",
    headers: { "transaction-id": randomBytes(16).toString("hex") },
    body: JSON.stringify({
      login: opts.login,
      password: opts.password,
      name: opts.name,
      server: opts.server,
      platform: "mt5",
      type: "cloud-g1",
      magic: 0,
      region: "london",
      reliability: "regular",
      tags: ["tradeway"],
    }),
  });
  const accountId = account.id || account._id;
  if (!accountId) throw new Error("MetaAPI account yaratildi, lekin account ID qaytmadi.");

  await new Promise((resolve) => setTimeout(resolve, 3000));
  await metaApiRequest(`${PROVISIONING_URL}/users/current/accounts/${encodeURIComponent(accountId)}/deploy`, { method: "POST" });
  await waitForConnection(accountId);
  return accountId;
}

/** Fetch closed deals in a date range. */
export async function fetchDeals(
  metaapiAccountId: string,
  from: Date,
  to: Date,
): Promise<MetaApiDeal[]> {
  const start = from.toISOString();
  const end   = to.toISOString();
  const url = `${CLIENT_URL}/users/current/accounts/${metaapiAccountId}/history-deals/time/${encodeURIComponent(start)}/${encodeURIComponent(end)}?limit=1000`;
  return metaApiRequest<MetaApiDeal[]>(url);
}

/* ── Trade reconstruction ─────────────────────────────────────────────────── */

export interface ReconstructedTrade {
  externalId: string;         // positionId
  symbol: string;
  side: "Long" | "Short";
  entryPrice: number;
  exitPrice: number;
  volume: number;
  pnl: number;
  commission: number;
  closedAt: string;           // ISO date (YYYY-MM-DD)
  comment: string;
}

/**
 * Group MetaAPI deals by positionId and reconstruct completed trades.
 * Only returns positions that are fully closed (have both IN and OUT deals).
 */
export function reconstructTrades(deals: MetaApiDeal[]): ReconstructedTrade[] {
  // Skip balance/deposit/withdrawal deals
  const tradingDeals = deals.filter(
    (d) => d.type === "DEAL_TYPE_BUY" || d.type === "DEAL_TYPE_SELL",
  );

  // Group by positionId
  const byPosition = new Map<string, MetaApiDeal[]>();
  for (const deal of tradingDeals) {
    const arr = byPosition.get(deal.positionId) ?? [];
    arr.push(deal);
    byPosition.set(deal.positionId, arr);
  }

  const trades: ReconstructedTrade[] = [];

  for (const [positionId, posDeals] of byPosition) {
    const inDeal  = posDeals.find((d) => d.entryType === "DEAL_ENTRY_IN");
    const outDeal = posDeals.find((d) => d.entryType === "DEAL_ENTRY_OUT");

    // Skip open positions (no OUT deal yet)
    if (!inDeal || !outDeal) continue;

    const side: "Long" | "Short" = inDeal.type === "DEAL_TYPE_BUY" ? "Long" : "Short";
    const pnl = posDeals.reduce((s, d) => s + (d.profit ?? 0), 0);
    const commission = posDeals.reduce((s, d) => s + (d.commission ?? 0), 0);
    const closedAt = outDeal.time.slice(0, 10); // YYYY-MM-DD

    trades.push({
      externalId: positionId,
      symbol: inDeal.symbol,
      side,
      entryPrice: inDeal.price,
      exitPrice: outDeal.price,
      volume: inDeal.volume,
      pnl: Math.round(pnl * 100) / 100,
      commission: Math.round(Math.abs(commission) * 100) / 100,
      closedAt,
      comment: inDeal.comment ?? "",
    });
  }

  return trades;
}
