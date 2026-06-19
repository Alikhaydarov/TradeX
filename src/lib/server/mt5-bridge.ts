export type Mt5BridgeDeal = {
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

type Mt5Credentials = {
  login: string;
  password: string;
  server: string;
};

function bridgeConfig() {
  const baseUrl = process.env.MT5_BRIDGE_URL?.replace(/\/$/, "");
  const token = process.env.MT5_BRIDGE_TOKEN;
  if (!baseUrl) throw new Error("MT5_BRIDGE_URL is not configured.");
  if (!token) throw new Error("MT5_BRIDGE_TOKEN is not configured.");
  return { baseUrl, token };
}

async function bridgeRequest<T>(path: string, payload: unknown) {
  const { baseUrl, token } = bridgeConfig();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(120000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("MT5 bridge is taking longer than expected. Please try again in a minute.");
    }
    throw error;
  }

  const data = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(data?.error || `MT5 bridge request failed (${response.status}).`);
  return data as T;
}

export async function testMt5BridgeLogin(credentials: Mt5Credentials) {
  return bridgeRequest<{ ok: true; login: number; server: string }>("/test-login", credentials);
}

export async function getMt5BridgeDeals(input: Mt5Credentials & { start: string; end: string }) {
  const data = await bridgeRequest<{ deals: Mt5BridgeDeal[] }>("/history-deals", input);
  return data.deals;
}
