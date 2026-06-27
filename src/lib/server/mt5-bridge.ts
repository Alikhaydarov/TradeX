const mt5BridgeBaseUrl = (process.env.MT5_BRIDGE_BASE_URL || process.env.MT5_BRIDGE_URL || "").replace(/\/$/, "");
const mt5BridgeToken = process.env.MT5_BRIDGE_TOKEN || "";

type BridgeHistoryResponse = {
  trades?: Mt5BridgeClosedTrade[];
};

export type Mt5BridgeClosedTrade = {
  id?: string | number;
  ticket?: string | number;
  positionId?: string | number;
  position_id?: string | number;
  externalDealId?: string | number;
  externalPositionId?: string | number;
  symbol: string;
  side?: "BUY" | "SELL" | "Long" | "Short" | "long" | "short";
  type?: string;
  entryPrice?: number;
  openPrice?: number;
  exitPrice?: number;
  closePrice?: number;
  volume?: number;
  lots?: number;
  profit?: number;
  pnl?: number;
  grossPnl?: number;
  netPnl?: number;
  commission?: number;
  swap?: number;
  closeTime?: string;
  openTime?: string;
  closedAt?: string;
  openedAt?: string;
  rawPayload?: unknown;
};

export type Mt5BridgeHistoryInput = {
  login: string;
  password: string;
  server: string;
  from: string;
  to: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function requireBridgeConfig() {
  if (!mt5BridgeBaseUrl) {
    throw new Error("MT5 self-host bridge is not configured. Set MT5_BRIDGE_BASE_URL to your own read-only bridge URL.");
  }
  if (!mt5BridgeToken) {
    throw new Error("MT5 bridge token is not configured. Set MT5_BRIDGE_TOKEN.");
  }
}

function safeJsonParse<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

function normalizeTrade(trade: Mt5BridgeClosedTrade): Mt5BridgeClosedTrade | null {
  const symbol = clean(trade.symbol).toUpperCase();
  if (!symbol) return null;
  const volume = Number(trade.volume ?? trade.lots ?? 0);
  if (!Number.isFinite(volume) || volume <= 0) return null;

  return {
    ...trade,
    id: trade.id ?? trade.externalDealId ?? trade.ticket ?? trade.externalPositionId ?? trade.positionId,
    ticket: trade.ticket ?? trade.externalDealId ?? trade.id,
    positionId: trade.positionId ?? trade.externalPositionId ?? trade.position_id ?? trade.ticket ?? trade.id,
    symbol,
    entryPrice: Number(trade.entryPrice ?? trade.openPrice ?? 0),
    openPrice: Number(trade.openPrice ?? trade.entryPrice ?? 0),
    exitPrice: Number(trade.exitPrice ?? trade.closePrice ?? trade.entryPrice ?? trade.openPrice ?? 0),
    closePrice: Number(trade.closePrice ?? trade.exitPrice ?? trade.entryPrice ?? trade.openPrice ?? 0),
    volume,
    lots: volume,
    profit: Number(trade.profit ?? trade.grossPnl ?? trade.pnl ?? trade.netPnl ?? 0),
    pnl: Number(trade.pnl ?? trade.netPnl ?? trade.grossPnl ?? trade.profit ?? 0),
    commission: Number(trade.commission ?? 0),
    swap: Number(trade.swap ?? 0),
    openTime: trade.openTime ?? trade.openedAt,
    closeTime: trade.closeTime ?? trade.closedAt,
    rawPayload: trade.rawPayload ?? trade,
  };
}

export async function getMt5ClosedTrades(input: Mt5BridgeHistoryInput) {
  const from = new Date(input.from);
  const to = new Date(input.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid MT5 history date range.");
  }

  requireBridgeConfig();

  const response = await fetch(`${mt5BridgeBaseUrl}/history/closed-trades`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${mt5BridgeToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      login: input.login,
      password: input.password,
      server: input.server,
      from: from.toISOString(),
      to: to.toISOString(),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(120000),
  });

  const text = await response.text();
  const payload = text
    ? safeJsonParse<BridgeHistoryResponse & { detail?: string; message?: string; error?: string }>(text)
    : null;

  if (!response.ok) {
    throw new Error(payload?.detail || payload?.error || payload?.message || `MT5 bridge request failed (${response.status}).`);
  }

  return (payload?.trades || [])
    .map(normalizeTrade)
    .filter((trade): trade is Mt5BridgeClosedTrade => Boolean(trade));
}
