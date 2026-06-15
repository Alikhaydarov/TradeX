import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";
export const runtime = "nodejs";

export async function DELETE(request: Request, context: { params: Promise<{id:string}> }) {
  const auth = await authenticateRequest(request); if (!auth) return unauthorized();
  const {id}=await context.params;
  const {error}=await auth.supabase.from("prop_accounts").delete().eq("id",id).eq("user_id",auth.user.id);
  if(error) return serverError(error.message); return Response.json({ok:true});
}
