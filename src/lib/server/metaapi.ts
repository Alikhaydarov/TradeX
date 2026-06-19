import { randomBytes } from "node:crypto";

const provisioningUrl = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";
const clientUrl = "https://mt-client-api-v1.london.agiliumtrade.ai";

function token() {
  const value = process.env.METAAPI_TOKEN;
  if (!value) throw new Error("METAAPI_TOKEN is not configured.");
  return value;
}

async function request<T>(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "auth-token": token(),
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const details = Array.isArray(payload?.details)
      ? payload.details.map((item: { message?: string }) => item.message).filter(Boolean).join(" ")
      : "";
    throw new Error(details || payload?.message || payload?.error || `MetaApi request failed (${response.status}).`);
  }
  return payload as T;
}

export type MetaApiAccount = {
  _id?: string;
  id?: string;
  state: string;
  connectionStatus?: string;
  login?: string;
};

export type MetaApiDeal = {
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
};

export async function createMetaApiAccount(input: { name: string; login: string; password: string; server: string; propAccountId: string }) {
  const account = await request<{ id?: string; _id?: string; state?: string }>(`${provisioningUrl}/users/current/accounts`, {
    method: "POST",
    headers: { "transaction-id": randomBytes(16).toString("hex") },
    body: JSON.stringify({
      name: input.name, type: "cloud-g2", login: input.login, password: input.password, server: input.server,
      platform: "mt5", magic: 0, region: "london", reliability: "regular", tags: ["tradeway", `prop:${input.propAccountId}`],
    }),
  });
  const id = account.id || account._id;
  if (!id) throw new Error("MetaApi created the account but did not return an account ID.");
  return { id, state: account.state };
}

export function updateMetaApiAccount(id: string, input: { name: string; password: string; server: string }) {
  return request(`${provisioningUrl}/users/current/accounts/${encodeURIComponent(id)}`, {
    method: "PUT", body: JSON.stringify({ name: input.name, password: input.password, server: input.server, magic: 0 }),
  });
}

export function deployMetaApiAccount(id: string, redeploy = false) {
  return request(`${provisioningUrl}/users/current/accounts/${encodeURIComponent(id)}/${redeploy ? "redeploy" : "deploy"}`, { method: "POST" });
}

export function removeMetaApiAccount(id: string) {
  return request(`${provisioningUrl}/users/current/accounts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function getMetaApiAccount(id: string) {
  return request<MetaApiAccount>(`${provisioningUrl}/users/current/accounts/${encodeURIComponent(id)}`);
}

export async function waitMetaApiConnected(id: string, timeoutMs = 180000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const account = await getMetaApiAccount(id);
    if (account.state === "DEPLOYED" && account.connectionStatus === "CONNECTED") return account;
    if (account.state === "DEPLOY_FAILED") throw new Error("MetaApi could not deploy this MT5 account.");
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new Error("MT5 connection timed out. Check login, password and broker server.");
}

export function getMetaApiDeals(id: string, start: Date, end: Date) {
  return request<MetaApiDeal[]>(`${clientUrl}/users/current/accounts/${encodeURIComponent(id)}/history-deals/time/${encodeURIComponent(start.toISOString())}/${encodeURIComponent(end.toISOString())}?limit=1000`);
}
