import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { notifyUsers } from "@/lib/server/push";
import { hasVerifiedPremiumAccess } from "@/lib/premium-plan";
import { after } from "next/server";

export const runtime = "nodejs";

interface MessageRecord {
  id: string;
  group_id: string;
  user_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  reply_to_id: string | null;
  reply_to_name: string | null;
  reply_to_content: string | null;
  created_at: string;
  sender_is_verified?: boolean;
}

interface ProfileRecord {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_verified: boolean | null;
  plan: string | null;
  premium_until: string | null;
}

const premiumVerified = hasVerifiedPremiumAccess;

async function hydrateVerification(
  auth: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>,
  messages: MessageRecord[],
) {
  const userIds = [...new Set(messages.map((message) => message.user_id).filter(Boolean))];
  if (!userIds.length) return messages;

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("id, is_verified, plan, premium_until")
    .in("id", userIds)
    .returns<Array<Pick<ProfileRecord, "id" | "is_verified" | "plan" | "premium_until">>>();

  if (error) throw new Error(error.message);
  const verification = new Map((data ?? []).map((profile) => [profile.id, premiumVerified(profile)]));
  return messages.map((message) => ({
    ...message,
    sender_is_verified: verification.get(message.user_id) ?? false,
  }));
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
      .select("id, group_id, user_id, sender_name, sender_avatar, content, reply_to_id, reply_to_name, reply_to_content, created_at")
      .eq("group_id", id)
      .order("created_at", { ascending: true })
      .limit(120)
      .returns<MessageRecord[]>();

    if (error) return serverError(error.message);
    return Response.json({ messages: await hydrateVerification(auth, data ?? []) });
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
  const body = (await request.json()) as { content?: string; replyToId?: string | null };
  const content = body.content?.trim();
  if (!content || content.length > 1000) return badRequest("Xabar matni 1-1000 belgi bo'lishi kerak.");

  try {
    if (!(await isMember(auth, id))) return unauthorized();

    const { data: profile, error: profileError } = await auth.supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, is_verified, plan, premium_until")
      .eq("id", auth.user.id)
      .single<ProfileRecord>();

    if (profileError) return serverError(profileError.message);

    let replyPayload: Pick<MessageRecord, "reply_to_id" | "reply_to_name" | "reply_to_content"> = {
      reply_to_id: null,
      reply_to_name: null,
      reply_to_content: null,
    };

    if (body.replyToId) {
      const { data: reply, error: replyError } = await auth.supabase
        .from("group_messages")
        .select("id, sender_name, content")
        .eq("id", body.replyToId)
        .eq("group_id", id)
        .single<{ id: string; sender_name: string; content: string }>();

      if (replyError) return badRequest("Reply qilinayotgan xabar topilmadi.");
      replyPayload = {
        reply_to_id: reply.id,
        reply_to_name: reply.sender_name,
        reply_to_content: reply.content.slice(0, 160),
      };
    }

    const { data, error } = await auth.supabase
      .from("group_messages")
      .insert({
        group_id: id,
        user_id: auth.user.id,
        sender_name: profile.full_name,
        sender_avatar: profile.avatar_url,
        content,
        ...replyPayload,
      })
      .select("id, group_id, user_id, sender_name, sender_avatar, content, reply_to_id, reply_to_name, reply_to_content, created_at")
      .single<MessageRecord>();

    if (error) return serverError(error.message);

    after(async () => {
      try {
        const [{ data: members }, { data: group }] = await Promise.all([
          auth.supabase.from("group_members").select("user_id").eq("group_id", id),
          auth.supabase.from("groups").select("name").eq("id", id).maybeSingle<{ name: string }>(),
        ]);

        const recipientIds = (members ?? [])
          .map((member) => member.user_id as string)
          .filter((userId) => userId !== auth.user.id);

        await notifyUsers(recipientIds, {
          title: `${profile.full_name} · ${group?.name ?? "Chat"}`,
          body: content.length > 120 ? `${content.slice(0, 119)}…` : content,
          data: { type: "chat", chatId: id, messageId: data.id },
        });
      } catch {
        // Push delivery must never affect the chat message response.
      }
    });

    return Response.json({
      message: {
        ...data,
        sender_is_verified: premiumVerified(profile),
      },
    }, { status: 201 });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
