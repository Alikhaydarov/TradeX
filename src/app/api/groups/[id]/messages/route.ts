import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return serverError("Database ulanmagan.");
  const { id } = await context.params;

  const { data, error } = await supabase
    .from("group_messages")
    .select("*")
    .eq("group_id", id)
    .order("created_at")
    .limit(100);

  if (error) return serverError(error.message);
  return Response.json({ messages: data });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id: groupId } = await context.params;
  const body = (await request.json()) as { content?: string };
  const content = body.content?.trim();
  if (!content || content.length > 1000) {
    return badRequest("Xabar 1 dan 1000 tagacha belgi bo'lishi kerak.");
  }

  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", auth.user.id)
    .single();
  if (profileError || !profile) return serverError(profileError?.message);

  const initials = profile.full_name
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2);
  const { data, error } = await auth.supabase
    .from("group_messages")
    .insert({
      group_id: groupId,
      user_id: auth.user.id,
      sender_name: profile.full_name,
      sender_avatar: profile.avatar_url || initials,
      content,
    })
    .select()
    .single();

  if (error) return serverError(error.message);
  return Response.json({ message: data }, { status: 201 });
}

