const bridgeUrl = process.env.MT5_BRIDGE_URL;
const bridgeToken = process.env.MT5_BRIDGE_TOKEN;

type BridgeTradeSide = "BUY" | "SELL" | "Long" | "Short" | "long" | "short";

export type Mt5BridgeClosedTrade = {
  id?: string | number;
  ticket?: string | number;
  positionId?: string | number;
  position_id?: string | number;
  symbol: string;
  side?: BridgeTradeSide;
  type?: BridgeTradeSide | string;
  entryPrice?: number;
  entry_price?: number;
  openPrice?: number;
  open_price?: number;
  exitPrice?: number;
  exit_price?: number;
  closePrice?: number;
  close_price?: number;
  volume?: number;
  lots?: number;
  quantity?: number;
  profit?: number;
  pnl?: number;
  commission?: number;
  swap?: number;
  fees?: number;
  closeTime?: string;
  close_time?: string;
  time?: string;
};

type BridgeHistoryResponse = {
  trades?: Mt5BridgeClosedTrade[];
  closedTrades?: Mt5BridgeClosedTrade[];
  closed_trades?: Mt5BridgeClosedTrade[];
};

export type Mt5BridgeHistoryInput = {
  login: string;
  password: string;
  server: string;
  from: string;
  to: string;
};

function getBridgeConfig() {
  if (!bridgeUrl) throw new Error("MT5 bridge URL is not configured.");
  if (!bridgeToken) throw new Error("MT5 bridge token is not configured.");
  return { url: bridgeUrl.replace(/\/$/, ""), token: bridgeToken };
}

export async function getMt5ClosedTrades(input: Mt5BridgeHistoryInput) {
  const { url, token } = getBridgeConfig();
  const response = await fetch(`${url}/history/closed-trades`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
    cache: "no-store",
    signal: AbortSignal.timeout(180000),
  });

  const payload = await response.json().catch(() => null) as BridgeHistoryResponse & { error?: string; message?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `MT5 bridge request failed (${response.status}).`);
  }

  return payload?.trades || payload?.closedTrades || payload?.closed_trades || [];
}
