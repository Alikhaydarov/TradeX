import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const body = await request.json() as { title?: string; issuer?: string; type?: string; imageUrl?: string; issuedAt?: string };
  const title = String(body.title || "").trim().slice(0, 80);
  const imageUrl = String(body.imageUrl || "").trim().slice(0, 1000);
  if (!title || !imageUrl) return badRequest("Certificate title and image are required.");

  const { data, error } = await auth.supabase.from("profile_achievements").insert({
    user_id: auth.user.id,
    title,
    issuer: String(body.issuer || "").trim().slice(0, 80),
    achievement_type: body.type === "payout" ? "payout" : "funded",
    image_url: imageUrl,
    issued_at: body.issuedAt || null,
  }).select("*").single();
  if (error) return serverError(error.message);
  return Response.json({ achievement: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return badRequest("Achievement ID is required.");
  const { error } = await auth.supabase.from("profile_achievements").delete().eq("id", id).eq("user_id", auth.user.id);
  if (error) return serverError(error.message);
  return Response.json({ success: true });
}
