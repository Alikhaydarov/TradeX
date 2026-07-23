import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { getPremiumStatus } from "@/lib/backend/premium";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  try {
    const status = await getPremiumStatus(auth);
    return Response.json(
      {
        ...status,
        aiEnabled: status.plan === "pro" && status.aiEnabled,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
