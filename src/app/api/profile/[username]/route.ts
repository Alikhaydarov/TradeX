import { authenticateRequest } from "@/lib/backend/auth";
import { loadProfileView } from "@/lib/server/profile-view";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  const auth = await authenticateRequest(request);
  const result = await loadProfileView(username, auth?.user.id ?? null);

  if (result.error) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json(result.data);
}
