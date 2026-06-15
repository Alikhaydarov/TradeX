import { authenticateRequest } from "@/lib/backend/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  return Response.json({ user: auth?.user ?? null });
}

