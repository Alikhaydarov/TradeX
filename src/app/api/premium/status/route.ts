import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { getPremiumStatus } from "@/lib/backend/premium";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  try {
    return Response.json(await getPremiumStatus(auth));
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
