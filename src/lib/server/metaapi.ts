const clientBase = process.env.METAAPI_CLIENT_URL || "https://mt-client-api-v1.new-york.agiliumtrade.ai";

function token() {
  const value = process.env.METAAPI_TOKEN;
  if (!value) throw new Error("METAAPI_TOKEN is not configured.");
  return value;
}

async function request<T>(path: string) {
  const response = await fetch(`${clientBase}${path}`, {
    headers: { Accept: "application/json", "auth-token": token() },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message || payload?.error || `MetaApi request failed (${response.status}).`);
  return payload as T;
}

export interface MetaApiDeal {
  id: string;
  positionId?: string;
  symbol: string;
  type: string;
  entryType?: string;
  price: number;
  volume: number;
  profit?: number;
  commission?: number;
  swap?: number;
  time: string;
}

export function getMt5AccountInformation(accountId: string) {
  return request<Record<string, unknown>>(`/users/current/accounts/${encodeURIComponent(accountId)}/account-information`);
}

export function getMt5Deals(accountId: string, start: string, end: string) {
  return request<MetaApiDeal[]>(`/users/current/accounts/${encodeURIComponent(accountId)}/history-deals/time/${encodeURIComponent(start)}/${encodeURIComponent(end)}?limit=1000`);
}

