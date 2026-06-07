import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, trading_style, location")
    .eq("id", auth.user.id)
    .single();

  if (error) return serverError(error.message);
  return Response.json({ profile: data });
}

export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = (await request.json()) as {
    fullName?: string;
    username?: string;
    avatarUrl?: string | null;
    bio?: string;
    tradingStyle?: string;
    location?: string;
  };
  const fullName = body.fullName?.trim();
  const username = body.username?.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim().slice(0, 1000) : null;

  if (!fullName || fullName.length > 80 || !username || username.length < 3 || username.length > 30) {
    return badRequest("Ism va username qiymatlarini tekshiring.");
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .update({
      full_name: fullName,
      username,
      avatar_url: avatarUrl || null,
      bio: body.bio?.trim().slice(0, 160) ?? "",
      trading_style: body.tradingStyle?.trim().slice(0, 50) || "Price Action",
      location: body.location?.trim().slice(0, 80) ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.user.id)
    .select("id, username, full_name, avatar_url, bio, trading_style, location")
    .single();

  if (error) {
    if (error.code === "23505") return badRequest("Bu username band.");
    return serverError(error.message);
  }
  return Response.json({ profile: data });
}
