import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

interface MessageRecord {
  id: string;
  group_id: string;
  user_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  created_at: string;
}

interface ProfileRecord {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

async function isMember(
  auth: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>,
  chatId: string,
) {
  const { data, error } = await auth.supabase
    .from("group_members")
    .select("group_id")
    .eq("group_id", chatId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { id } = await params;

  try {
    if (!(await isMember(auth, id))) return unauthorized();

    const { data, error } = await auth.supabase
      .from("group_messages")
      .select("id, group_id, user_id, sender_name, sender_avatar, content, created_at")
      .eq("group_id", id)
      .order("created_at", { ascending: true })
      .limit(120)
      .returns<MessageRecord[]>();

    if (error) return serverError(error.message);
    return Response.json({ messages: data });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { id } = await params;
  const body = (await request.json()) as { content?: string };
  const content = body.content?.trim();
  if (!content || content.length > 1000) return badRequest("Xabar matni 1-1000 belgi bo'lishi kerak.");

  try {
    if (!(await isMember(auth, id))) return unauthorized();

    const { data: profile, error: profileError } = await auth.supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .eq("id", auth.user.id)
      .single<ProfileRecord>();

    if (profileError) return serverError(profileError.message);

    const { data, error } = await auth.supabase
      .from("group_messages")
      .insert({
        group_id: id,
        user_id: auth.user.id,
        sender_name: profile.full_name,
        sender_avatar: profile.avatar_url,
        content,
      })
      .select("id, group_id, user_id, sender_name, sender_avatar, content, created_at")
      .single<MessageRecord>();

    if (error) return serverError(error.message);
    return Response.json({ message: data }, { status: 201 });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
