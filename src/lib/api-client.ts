type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: BodyInit | null;
  headers?: Record<string, string>;
  /**
   * Serve a previously fetched response for this many milliseconds before
   * hitting the network again. Anything older than the window is refetched.
   * Only applies to GET requests; 0 (the default) keeps the previous
   * always-network behaviour.
   */
  cacheMs?: number;
}

const inFlightGets = new Map<string, Promise<unknown>>();

interface CacheEntry {
  value: unknown;
  storedAt: number;
}

const getCache = new Map<string, CacheEntry>();

/**
 * Every mutation invalidates the read cache. This is deliberately blunt: the
 * cache windows are short, and a stale list after a write is a much worse bug
 * than one extra fetch.
 */
export function invalidateApiCache() {
  getCache.clear();
}

export async function apiRequest<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  if (!url.startsWith("/") || url.startsWith("//")) {
    throw new Error("API requests must use a same-origin path.");
  }

  const { method = "GET", body, headers = {}, cacheMs = 0 } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const requestHeaders = {
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    Accept: "application/json",
    ...headers,
  };
  const key = `${url}:${JSON.stringify(requestHeaders)}`;

  if (method === "GET") {
    if (cacheMs > 0) {
      const cached = getCache.get(key);
      if (cached && Date.now() - cached.storedAt < cacheMs) {
        return cached.value as T;
      }
    }

    const pending = inFlightGets.get(key);
    if (pending) return pending as Promise<T>;

    const request = performRequest<T>(url, method, body, requestHeaders);
    inFlightGets.set(key, request);
    try {
      const value = await request;
      if (cacheMs > 0) getCache.set(key, { value, storedAt: Date.now() });
      return value;
    } finally {
      inFlightGets.delete(key);
    }
  }

  const result = await performRequest<T>(url, method, body, requestHeaders);
  invalidateApiCache();
  return result;
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
