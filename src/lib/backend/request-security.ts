import type { ApiAuth } from "./auth";

type JsonReadResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  source: "database" | "memory";
};

type MemoryWindow = {
  count: number;
  resetAt: number;
};

const memoryRateLimits = new Map<string, MemoryWindow>();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_IN_TEXT_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const SECRET_PATTERN = /\b(?:gsk_|sk_(?:live|test)_|sbp_|ghp_|github_pat_)[A-Za-z0-9_-]{10,}\b/g;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;

export function privateJson(
  body: unknown,
  init: { status?: number; headers?: HeadersInit } = {},
) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return Response.json(body, { status: init.status ?? 200, headers });
}

export function isUuid(value: string | null | undefined) {
  return Boolean(value && UUID_PATTERN.test(value));
}

export function rejectCrossSiteMutation(request: Request) {
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return null;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return privateJson({ error: "Cross-site request blocked." }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  if (!origin) return null;

  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const expectedHost = (forwardedHost || request.headers.get("host") || requestUrl.host).toLowerCase();
    const expectedProto = (forwardedProto || requestUrl.protocol.replace(":", "")).toLowerCase();

    if (
      originUrl.host.toLowerCase() !== expectedHost ||
      originUrl.protocol.replace(":", "").toLowerCase() !== expectedProto
    ) {
      return privateJson({ error: "Request origin is not allowed." }, { status: 403 });
    }
  } catch {
    return privateJson({ error: "Invalid request origin." }, { status: 403 });
  }

  return null;
}

export async function readJsonBody<T>(
  request: Request,
  maxBytes = 8_192,
): Promise<JsonReadResult<T>> {
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.startsWith("application/json")) {
    return {
      ok: false,
      response: privateJson(
        { error: "Content-Type must be application/json." },
        { status: 415 },
      ),
    };
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return {
      ok: false,
      response: privateJson({ error: "Request body is too large." }, { status: 413 }),
    };
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return {
      ok: false,
      response: privateJson({ error: "Request body is too large." }, { status: 413 }),
    };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return {
      ok: false,
      response: privateJson({ error: "Invalid JSON request body." }, { status: 400 }),
    };
  }
}

export function redactSensitiveText(value: string) {
  return value
    .replace(SECRET_PATTERN, "[secret hidden]")
    .replace(JWT_PATTERN, "[token hidden]")
    .replace(EMAIL_PATTERN, "[email hidden]")
    .replace(UUID_IN_TEXT_PATTERN, "[account reference hidden]")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

export function sanitizeUntrustedNote(value: string | null | undefined, max = 160) {
  if (!value) return "";
  return redactSensitiveText(value).replace(/https?:\/\/\S+/gi, "[link removed]").slice(0, max);
}

export async function consumeRateLimit(
  auth: ApiAuth,
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const safeAction = action.trim().slice(0, 80);
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const safeWindow = Math.max(1, Math.min(86_400, Math.floor(windowSeconds)));

  const { data, error } = await auth.supabase.rpc("consume_ai_rate_limit", {
    p_action: safeAction,
    p_limit: safeLimit,
    p_window_seconds: safeWindow,
  });

  const row = Array.isArray(data) ? data[0] : data;
  if (!error && row && typeof row === "object") {
    const record = row as Record<string, unknown>;
    return {
      allowed: Boolean(record.allowed),
      retryAfterSeconds: Math.max(0, Number(record.retry_after_seconds || 0)),
      source: "database",
    };
  }

  if (
    error &&
    !/consume_ai_rate_limit|function .* does not exist|schema cache/i.test(error.message)
  ) {
    throw new Error("Rate-limit verification failed.");
  }

  const now = Date.now();
  const key = `${auth.user.id}:${safeAction}`;
  const current = memoryRateLimits.get(key);
  if (!current || current.resetAt <= now) {
    memoryRateLimits.set(key, { count: 1, resetAt: now + safeWindow * 1000 });
    return { allowed: true, retryAfterSeconds: 0, source: "memory" };
  }

  current.count += 1;
  memoryRateLimits.set(key, current);
  return {
    allowed: current.count <= safeLimit,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    source: "memory",
  };
}
