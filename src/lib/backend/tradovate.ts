import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { decryptSecret, encryptSecret } from "./crypto";

type TradovateEnvironment = "live" | "demo";

type TradovateOAuthState = {
  userId: string;
  accountId: string;
  nonce: string;
  expiresAt: number;
};

export type TradovateTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  error?: string;
  error_description?: string;
};

export type TradovateAccount = {
  id: number;
  name: string;
  userId?: number;
  active?: boolean;
  accountType?: string;
};

export type TradovateConnection = {
  id: string;
  user_id: string;
  prop_account_id: string;
  tradovate_user_id: number | null;
  tradovate_account_id: number | null;
  tradovate_account_name: string | null;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
  environment: TradovateEnvironment;
  status: "connected" | "error" | "disconnected";
  last_synced_at: string | null;
  last_error: string | null;
};

export type TradovateJournalAccount = {
  id: string;
  name: string;
  market_type?: string | null;
  account_size?: number | string | null;
  profit_target?: number | string | null;
  max_drawdown?: number | string | null;
};

type TradovateOrder = {
  id: number;
  accountId: number;
  contractId?: number;
};

type TradovateFill = {
  id: number;
  orderId: number;
  contractId: number;
  timestamp: string;
  action: "Buy" | "Sell";
  qty: number;
  price: number;
};

type TradovateFillPair = {
  id: number;
  positionId: number;
  buyFillId: number;
  sellFillId: number;
  qty: number;
  buyPrice: number;
  sellPrice: number;
};

type TradovatePosition = {
  id: number;
  accountId: number;
  contractId: number;
};

type TradovateContract = {
  id: number;
  name: string;
  contractMaturityId: number;
};

type TradovateContractMaturity = {
  id: number;
  productId: number;
};

type TradovateProduct = {
  id: number;
  name: string;
  valuePerPoint: number;
};

type TradovateCashBalanceLog = {
  id: number;
  accountId: number;
  timestamp: string;
  fillPairId?: number;
  realizedPnL?: number;
  delta?: number;
};

export type TradovateJournalRow = {
  user_id: string;
  prop_account_id: string;
  symbol: string;
  side: "Long" | "Short";
  entry_price: number;
  exit_price: number;
  quantity: number;
  fees: number;
  pnl: number;
  note: string;
  traded_at: string;
  account_name: string;
  market_type: string;
  setup: string;
  risk_amount: number;
  result_r: number;
  account_size: number;
  profit_target: number;
  max_drawdown: number;
  external_source: "tradovate_api";
  external_id: string;
};

function env(name: string) {
  return String(process.env[name] || "").trim();
}

function appUrl() {
  const configured = env("NEXT_PUBLIC_APP_URL");
  if (configured) return configured.replace(/\/$/, "");
  const vercel = env("VERCEL_URL");
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function getTradovateConfig() {
  const environment: TradovateEnvironment = env("TRADOVATE_ENV") === "demo" ? "demo" : "live";
  const clientId = env("TRADOVATE_CLIENT_ID");
  const clientSecret = env("TRADOVATE_CLIENT_SECRET");
  const redirectUri = env("TRADOVATE_REDIRECT_URI") || `${appUrl()}/api/tradovate/callback`;
  const apiBase = env("TRADOVATE_API_BASE") || `https://${environment}.tradovateapi.com/v1`;
  const tokenUrl = env("TRADOVATE_TOKEN_URL") || `https://${environment}.tradovateapi.com/auth/oauthtoken`;
  const oauthUrl = env("TRADOVATE_OAUTH_URL") || "https://trader.tradovate.com/oauth";
  const stateSecret = env("TRADOVATE_STATE_SECRET") || env("CONNECTOR_ENCRYPTION_KEY");

  if (!clientId || !clientSecret) {
    throw new Error("TRADOVATE_CLIENT_ID and TRADOVATE_CLIENT_SECRET are required.");
  }
  if (!stateSecret) {
    throw new Error("TRADOVATE_STATE_SECRET or CONNECTOR_ENCRYPTION_KEY is required.");
  }

  return {
    environment,
    clientId,
    clientSecret,
    redirectUri,
    apiBase,
    tokenUrl,
    oauthUrl,
    stateSecret,
  };
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

export function createTradovateOAuthState(userId: string, accountId: string) {
  const config = getTradovateConfig();
  const payload: TradovateOAuthState = {
    userId,
    accountId,
    nonce: randomBytes(16).toString("hex"),
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  const encoded = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", config.stateSecret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyTradovateOAuthState(state: string): TradovateOAuthState {
  const config = getTradovateConfig();
  const [encoded, suppliedSignature] = state.split(".");
  if (!encoded || !suppliedSignature) throw new Error("Invalid Tradovate OAuth state.");

  const expectedSignature = createHmac("sha256", config.stateSecret).update(encoded).digest("base64url");
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new Error("Invalid Tradovate OAuth state signature.");
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TradovateOAuthState;
  if (!payload.userId || !payload.accountId || !payload.expiresAt || payload.expiresAt < Date.now()) {
    throw new Error("Tradovate OAuth state expired.");
  }
  return payload;
}

export function buildTradovateAuthorizationUrl(state: string) {
  const config = getTradovateConfig();
  const url = new URL(config.oauthUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

async function tokenRequest(params: URLSearchParams) {
  const config = getTradovateConfig();
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as TradovateTokenResponse;
  if (!response.ok || payload.error || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        `Tradovate token exchange failed (${response.status}).`,
    );
  }
  return payload;
}

export function exchangeTradovateCode(code: string) {
  const config = getTradovateConfig();
  return tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  );
}

export function refreshTradovateToken(refreshToken: string) {
  const config = getTradovateConfig();
  return tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  );
}

export async function tradovateRequest<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const config = getTradovateConfig();
  const response = await fetch(
    `${config.apiBase}${path.startsWith("/") ? path : `/${path}`}`,
    {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(init?.headers || {}),
      },
      cache: "no-store",
    },
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "errorText" in payload
        ? String((payload as { errorText?: unknown }).errorText || "")
        : "";
    throw new Error(message || `Tradovate request failed (${response.status}).`);
  }
  return payload as T;
}

export function listTradovateAccounts(accessToken: string) {
  return tradovateRequest<TradovateAccount[]>(accessToken, "/account/list");
}

export function encryptTradovateToken(token: string) {
  return encryptSecret(token);
}

export function decryptTradovateToken(token: string) {
  return decryptSecret(token);
}

export function tokenExpiresAt(expiresIn?: number) {
  const seconds = Number.isFinite(expiresIn) && Number(expiresIn) > 0 ? Number(expiresIn) : 3600;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function numeric(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function date(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString().slice(0, 10)
    : parsed.toISOString().slice(0, 10);
}

export async function loadTradovateJournalRows(params: {
  accessToken: string;
  externalAccountId: number;
  userId: string;
  account: TradovateJournalAccount;
}) {
  const [orders, fills, fillPairs, positions, contracts, maturities, products, cashLogs] =
    await Promise.all([
      tradovateRequest<TradovateOrder[]>(params.accessToken, "/order/list"),
      tradovateRequest<TradovateFill[]>(params.accessToken, "/fill/list"),
      tradovateRequest<TradovateFillPair[]>(params.accessToken, "/fillPair/list"),
      tradovateRequest<TradovatePosition[]>(params.accessToken, "/position/list"),
      tradovateRequest<TradovateContract[]>(params.accessToken, "/contract/list"),
      tradovateRequest<TradovateContractMaturity[]>(params.accessToken, "/contractMaturity/list"),
      tradovateRequest<TradovateProduct[]>(params.accessToken, "/product/list"),
      tradovateRequest<TradovateCashBalanceLog[]>(params.accessToken, "/cashBalanceLog/list"),
    ]);

  const ordersById = new Map(orders.map((item) => [item.id, item]));
  const fillsById = new Map(fills.map((item) => [item.id, item]));
  const positionsById = new Map(positions.map((item) => [item.id, item]));
  const contractsById = new Map(contracts.map((item) => [item.id, item]));
  const maturitiesById = new Map(maturities.map((item) => [item.id, item]));
  const productsById = new Map(products.map((item) => [item.id, item]));
  const cashLogByFillPair = new Map(
    cashLogs
      .filter((item) => item.accountId === params.externalAccountId && item.fillPairId)
      .map((item) => [Number(item.fillPairId), item]),
  );
  const accountSize = numeric(params.account.account_size);
  const profitTarget = numeric(params.account.profit_target);
  const maxDrawdown = numeric(params.account.max_drawdown);

  return fillPairs.flatMap<TradovateJournalRow>((pair) => {
    const position = positionsById.get(pair.positionId);
    const buyFill = fillsById.get(pair.buyFillId);
    const sellFill = fillsById.get(pair.sellFillId);
    if (!position || position.accountId !== params.externalAccountId || !buyFill || !sellFill) {
      return [];
    }

    const buyOrder = ordersById.get(buyFill.orderId);
    const sellOrder = ordersById.get(sellFill.orderId);
    if (
      buyOrder?.accountId !== params.externalAccountId ||
      sellOrder?.accountId !== params.externalAccountId
    ) {
      return [];
    }

    const contract = contractsById.get(
      position.contractId || buyFill.contractId || sellFill.contractId,
    );
    const maturity = contract ? maturitiesById.get(contract.contractMaturityId) : undefined;
    const product = maturity ? productsById.get(maturity.productId) : undefined;
    const buyTime = new Date(buyFill.timestamp).getTime();
    const sellTime = new Date(sellFill.timestamp).getTime();
    const side: "Long" | "Short" = buyTime <= sellTime ? "Long" : "Short";
    const entryPrice = side === "Long" ? numeric(pair.buyPrice) : numeric(pair.sellPrice);
    const exitPrice = side === "Long" ? numeric(pair.sellPrice) : numeric(pair.buyPrice);
    const quantity = Math.max(0, numeric(pair.qty));
    const valuePerPoint = numeric(product?.valuePerPoint) || 1;
    const computedPnl =
      (numeric(pair.sellPrice) - numeric(pair.buyPrice)) * valuePerPoint * quantity;
    const cashLog = cashLogByFillPair.get(pair.id);
    const reportedPnl = numeric(cashLog?.realizedPnL ?? cashLog?.delta);
    const pnl = reportedPnl || computedPnl;
    const closeTimestamp = cashLog?.timestamp ||
      (buyTime > sellTime ? buyFill.timestamp : sellFill.timestamp);

    return [
      {
        user_id: params.userId,
        prop_account_id: params.account.id,
        symbol: String(
          contract?.name || product?.name || `CONTRACT-${position.contractId}`,
        ).toUpperCase(),
        side,
        entry_price: entryPrice,
        exit_price: exitPrice,
        quantity,
        fees: 0,
        pnl: Number(pnl.toFixed(2)),
        note: "Synced from Tradovate OAuth",
        traded_at: date(closeTimestamp),
        account_name: params.account.name,
        market_type: params.account.market_type || "Futures",
        setup: "Tradovate sync",
        risk_amount: 0,
        result_r: 0,
        account_size: accountSize,
        profit_target: profitTarget,
        max_drawdown: maxDrawdown,
        external_source: "tradovate_api",
        external_id: `fill-pair:${pair.id}`,
      },
    ];
  });
}
