/**
 * Lightweight MetaAPI REST client.
 * Docs: https://metaapi.cloud/docs/client/
 */

const BASE = "https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai";

export function getMetaApiToken(): string | null {
  return process.env.METAAPI_TOKEN ?? null;
}

interface MetaApiAccount {
  _id: string;
  state: string;
  connectionStatus: string;
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

/** Create a MetaAPI provisioned account for an MT5 account. */
export async function createMetaApiAccount(opts: {
  login: string;
  password: string;
  server: string;
  name: string;
}): Promise<string> {
  const token = getMetaApiToken();
  if (!token) throw new Error("METAAPI_TOKEN not configured.");

  const res = await fetch(`${BASE}/users/current/accounts`, {
    method: "POST",
    headers: { "auth-token": token, "Content-Type": "application/json" },
    body: JSON.stringify({
      login: opts.login,
      password: opts.password,
      name: opts.name,
      server: opts.server,
      platform: "mt5",
      type: "cloud",
      magic: 0,
      application: "MetaApi",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `MetaAPI error ${res.status}`);
  }
  const data = await res.json() as MetaApiAccount;
  return data._id;
}

/** Fetch closed deals in a date range. */
export async function fetchDeals(
  metaapiAccountId: string,
  from: Date,
  to: Date,
): Promise<MetaApiDeal[]> {
  const token = getMetaApiToken();
  if (!token) throw new Error("METAAPI_TOKEN not configured.");

  const start = from.toISOString();
  const end   = to.toISOString();
  const url = `${BASE}/users/current/accounts/${metaapiAccountId}/history-deals/time/${encodeURIComponent(start)}/${encodeURIComponent(end)}`;

  const res = await fetch(url, { headers: { "auth-token": token } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `MetaAPI error ${res.status}`);
  }
  return res.json() as Promise<MetaApiDeal[]>;
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
