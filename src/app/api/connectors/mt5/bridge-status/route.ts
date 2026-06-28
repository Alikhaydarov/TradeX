import { authenticateRequest, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

const bridgeBaseUrl = (process.env.MT5_BRIDGE_BASE_URL || process.env.MT5_BRIDGE_URL || "").replace(/\/$/, "");
const bridgeToken = process.env.MT5_BRIDGE_TOKEN || "";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  if (!bridgeBaseUrl) {
    return Response.json({
      configured: false,
      reachable: false,
      error: "MT5_BRIDGE_BASE_URL is not configured.",
    }, { status: 503 });
  }

  if (!bridgeToken) {
    return Response.json({
      configured: false,
      reachable: false,
      error: "MT5_BRIDGE_TOKEN is not configured.",
    }, { status: 503 });
  }

  try {
    const response = await fetch(`${bridgeBaseUrl}/status`, {
      headers: { Authorization: `Bearer ${bridgeToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => null);

    return Response.json({
      configured: true,
      reachable: response.ok,
      status: response.status,
      bridge: payload,
    }, { status: response.ok ? 200 : 502 });
  } catch (error) {
    return Response.json({
      configured: true,
      reachable: false,
      error: error instanceof Error ? error.message : "Bridge status check failed.",
    }, { status: 502 });
  }
}
