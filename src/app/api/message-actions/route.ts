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

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = (await request.json()) as { messageId?: string; content?: string };
  const content = body.content?.trim();

  if (!body.messageId) return badRequest("Xabar tanlanmadi.");
  if (!content || content.length > 1000) {
    return badRequest("Xabar matni 1-1000 belgi bo'lishi kerak.");
  }

  const { data, error } = await auth.supabase
    .from("group_messages")
    .update({ content })
    .eq("id", body.messageId)
    .eq("user_id", auth.user.id)
    .select("id, group_id, user_id, sender_name, sender_avatar, content, created_at")
    .single<MessageRecord>();

  if (error) return serverError(error.message);
  return Response.json({ message: data });
}
