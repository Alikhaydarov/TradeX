import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
export const runtime = "nodejs";

function text(value: unknown, max = 80) {
  return String(value || "").trim().slice(0, max);
}

export async function PATCH(request: Request, context: { params: Promise<{id:string}> }) {
  const auth = await authenticateRequest(request); if (!auth) return unauthorized();
  const {id}=await context.params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if ("name" in body) {
    const name = text(body.name);
    if (!name) return badRequest("Account name is required.");
    patch.name = name;
  }
  if ("firm" in body) patch.firm = text(body.firm);
  if ("phase" in body) patch.phase = text(body.phase, 40) || "Challenge";
  if ("marketType" in body) patch.market_type = text(body.marketType, 30) || "CFD";
  if ("propSite" in body) patch.prop_site = text(body.propSite, 120);
  if ("propLogin" in body) patch.prop_login = text(body.propLogin, 120);

  const { data, error } = await auth.supabase
    .from("prop_accounts")
    .update(patch)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("*")
    .single();
  if(error) return serverError(error.message);
  return Response.json({account:data});
}

export async function DELETE(request: Request, context: { params: Promise<{id:string}> }) {
  const auth = await authenticateRequest(request); if (!auth) return unauthorized();
  const {id}=await context.params;
  const {error}=await auth.supabase.from("prop_accounts").delete().eq("id",id).eq("user_id",auth.user.id);
  if(error) return serverError(error.message); return Response.json({ok:true});
}
