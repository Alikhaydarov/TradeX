type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: string;
  headers?: Record<string, string>;
}

export async function apiRequest<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const res = await fetch(url, {
    method,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
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
