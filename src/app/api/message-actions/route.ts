import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { hasVerifiedPremiumAccess } from "@/lib/premium-plan";

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
  is_verified: boolean | null;
  plan: string | null;
  premium_until: string | null;
}

const premiumVerified = hasVerifiedPremiumAccess;

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
    .select("id, group_id, user_id, sender_name, sender_avatar, content, reply_to_id, reply_to_name, reply_to_content, created_at")
    .single<MessageRecord>();

  if (error) return serverError(error.message);

  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("is_verified, plan, premium_until")
    .eq("id", data.user_id)
    .single<ProfileRecord>();

  if (profileError) return serverError(profileError.message);
  return Response.json({
    message: {
      ...data,
      sender_is_verified: premiumVerified(profile),
    },
  });
}
