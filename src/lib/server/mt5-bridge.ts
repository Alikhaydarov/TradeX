const mtapiBaseUrl = (process.env.MTAPI_BASE_URL || "https://mt5.mtapi.io").replace(/\/$/, "");

type MtapiOrderHistoryResponse = {
  partialResponse?: boolean;
  orders?: MtapiOrder[];
};

type MtapiSearchResponse = Array<{
  companyName?: string;
  results?: Array<{
    name?: string;
    access?: string[];
  }>;
}>;

type MtapiOrder = {
  ticket?: string | number;
  positionId?: string | number;
  positionID?: string | number;
  symbol?: string;
  orderType?: string;
  dealType?: string;
  lots?: number;
  closeLots?: number;
  volume?: number;
  openPrice?: number;
  closePrice?: number;
  profit?: number;
  swap?: number;
  commission?: number;
  fee?: number;
  openTime?: string;
  closeTime?: string;
  openTimestampUTC?: number;
  closeTimestampUTC?: number;
};

export type Mt5BridgeClosedTrade = {
  id?: string | number;
  ticket?: string | number;
  positionId?: string | number;
  position_id?: string | number;
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
  commission?: number;
  swap?: number;
  closeTime?: string;
  openTime?: string;
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

function isHostPort(value: string) {
  return /^[a-z0-9.-]+:\d+$/i.test(value) || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value);
}

function parseAccess(value: string) {
  const [host, port] = value.includes(":") ? value.split(":") : [value, "443"];
  return { host, port: port || "443" };
}

function toIsoFromTimestamp(timestamp?: number) {
  if (!timestamp) return undefined;
  const value = timestamp > 10_000_000_000 ? timestamp : timestamp * 1000;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

async function requestJson<T>(path: string, timeoutMs = 90000): Promise<T> {
  const response = await fetch(`${mtapiBaseUrl}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  const payload = text
    ? safeJsonParse<T & { message?: string; error?: string }>(text)
    : null;
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `MTAPI request failed (${response.status}).`);
  }
  return payload as T;
}

function safeJsonParse<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

async function findBrokerAccess(server: string) {
  const direct = clean(server);
  if (!direct) throw new Error("MT5 broker server is required.");
  if (isHostPort(direct)) return parseAccess(direct);

  const searchTerms = Array.from(new Set([
    direct,
    direct.replace(/-MT5.*/i, ""),
    direct.split("-")[0],
  ].filter(Boolean)));

  for (const term of searchTerms) {
    const companies = await requestJson<MtapiSearchResponse>(
      `/Search?company=${encodeURIComponent(term)}`,
      30000,
    );
    const exact = companies
      .flatMap((company) => company.results || [])
      .find((result) => result.name?.toLowerCase() === direct.toLowerCase());
    const fuzzy = companies
      .flatMap((company) => company.results || [])
      .find((result) => result.name?.toLowerCase().includes(direct.toLowerCase()));
    const result = exact || fuzzy;
    const access = result?.access?.[0];
    if (access) return parseAccess(access);
  }

  throw new Error(`MTAPI broker server not found: ${direct}. Try entering host:port from MTAPI Search.`);
}

function normalizeSide(order: MtapiOrder) {
  const value = `${order.orderType || ""} ${order.dealType || ""}`.toUpperCase();
  return value.includes("SELL") ? "Short" : "Long";
}

function isRealClosedTrade(order: MtapiOrder) {
  const symbol = clean(order.symbol);
  const lots = Number(order.closeLots ?? order.lots ?? order.volume ?? 0);
  const dealType = clean(order.dealType).toUpperCase();
  const orderType = clean(order.orderType).toUpperCase();
  if (!symbol || !Number.isFinite(lots) || lots <= 0) return false;
  if (dealType === "BALANCE" || orderType === "BALANCE") return false;
  return true;
}

function normalizeOrder(order: MtapiOrder): Mt5BridgeClosedTrade | null {
  if (!isRealClosedTrade(order)) return null;
  const openTime = order.openTime || toIsoFromTimestamp(order.openTimestampUTC);
  const closeTime = order.closeTime || toIsoFromTimestamp(order.closeTimestampUTC);
  return {
    id: order.ticket,
    ticket: order.ticket,
    positionId: order.positionId ?? order.positionID ?? order.ticket,
    symbol: clean(order.symbol).toUpperCase(),
    side: normalizeSide(order),
    type: order.orderType || order.dealType,
    entryPrice: Number(order.openPrice || 0),
    openPrice: Number(order.openPrice || 0),
    exitPrice: Number(order.closePrice || order.openPrice || 0),
    closePrice: Number(order.closePrice || order.openPrice || 0),
    volume: Number(order.closeLots ?? order.lots ?? order.volume ?? 0),
    lots: Number(order.closeLots ?? order.lots ?? order.volume ?? 0),
    profit: Number(order.profit || 0),
    pnl: Number(order.profit || 0) + Number(order.swap || 0) + Number(order.commission || 0) + Number(order.fee || 0),
    commission: Number(order.commission || order.fee || 0),
    swap: Number(order.swap || 0),
    openTime,
    closeTime,
    rawPayload: order,
  };
}

async function connect(input: Mt5BridgeHistoryInput) {
  const { host, port } = await findBrokerAccess(input.server);
  const token = await requestJson<string>(
    `/Connect?user=${encodeURIComponent(input.login)}&password=${encodeURIComponent(input.password)}&host=${encodeURIComponent(host)}&port=${encodeURIComponent(port)}`,
    90000,
  );
  if (!token) throw new Error("MTAPI did not return a connection token.");
  return token;
}

async function disconnect(token: string) {
  try {
    await requestJson(`/Disconnect?id=${encodeURIComponent(token)}`, 20000);
  } catch {
    // Best effort cleanup only.
  }
}

export async function getMt5ClosedTrades(input: Mt5BridgeHistoryInput) {
  const from = new Date(input.from);
  const to = new Date(input.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid MT5 history date range.");
  }

  const token = await connect(input);
  try {
    const history = await requestJson<MtapiOrderHistoryResponse>(
      `/OrderHistory?id=${encodeURIComponent(token)}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}&sort=CloseTime&ascending=true`,
      120000,
    );
    return (history.orders || [])
      .map(normalizeOrder)
      .filter((trade): trade is Mt5BridgeClosedTrade => Boolean(trade));
  } finally {
    await disconnect(token);
  }
}
