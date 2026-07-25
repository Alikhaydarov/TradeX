type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: BodyInit | null;
  headers?: Record<string, string>;
}

const inFlightGets = new Map<string, Promise<unknown>>();
const responseCache = new Map<string, { value: unknown; expiresAt: number }>();

// A small client cache keeps route-to-route navigation instant without making
// trading data stale for long. Mutations clear it immediately.
const GET_CACHE_TTL_MS = 4_000;

export async function apiRequest<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  if (!url.startsWith("/") || url.startsWith("//")) {
    throw new Error("API requests must use a same-origin path.");
  }

  const { method = "GET", body, headers = {} } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const requestHeaders = {
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    Accept: "application/json",
    ...headers,
  };
  const key = `${url}:${JSON.stringify(requestHeaders)}`;

  if (method === "GET") {
    const cached = responseCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    if (cached) responseCache.delete(key);

    const pending = inFlightGets.get(key);
    if (pending) return pending as Promise<T>;

    const request = performRequest<T>(url, method, body, requestHeaders).then(
      (value) => {
        responseCache.set(key, { value, expiresAt: Date.now() + GET_CACHE_TTL_MS });
        return value;
      },
    );
    inFlightGets.set(key, request);
    try {
      return await request;
    } finally {
      inFlightGets.delete(key);
    }
  }

  responseCache.clear();
  return performRequest<T>(url, method, body, requestHeaders);
}

export function invalidateApiCache(url?: string) {
  if (!url) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.startsWith(`${url}:`)) responseCache.delete(key);
  }
}

async function performRequest<T>(
  url: string,
  method: HttpMethod,
  body: BodyInit | null | undefined,
  headers: Record<string, string>,
): Promise<T> {
  const res = await fetch(url, {
    method,
    cache: "no-store",
    credentials: "same-origin",
    headers,
    body: body ?? undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const message = extractErrorMessage(text);
    throw new Error(message || res.statusText || `Request failed (${res.status}).`);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function extractErrorMessage(text: string) {
  if (!text) return "";
  try {
    const payload = JSON.parse(text) as { error?: unknown; message?: unknown };
    const message = typeof payload.error === "string"
      ? payload.error
      : typeof payload.message === "string"
        ? payload.message
        : "";
    return message || text;
  } catch {
    return text;
  }
}
