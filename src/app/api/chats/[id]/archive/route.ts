import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { id } = await params;
  const { data: group } = await auth.supabase
    .from("groups")
    .select("name")
    .eq("id", id)
    .maybeSingle<{ name: string }>();

  if (group?.name === "TradeWay Community") return badRequest("The TradeWay Community cannot be hidden.");

  const { error } = await auth.supabase.rpc("archive_chat", {
    target_group_id: id,
  });

  if (error) return serverError(error.message);
  return Response.json({ success: true });
}
