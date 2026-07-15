import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { sendSocialNotification } from "@/lib/backend/social-notifications";
import { hasVerifiedPremiumAccess } from "@/lib/premium-plan";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface ReplyRecord {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface ReplyAuthor {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  plan?: string | null;
  premium_until?: string | null;
}

const premiumVerified = hasVerifiedPremiumAccess;

function mapReplies(replies: ReplyRecord[], authors: ReplyAuthor[]) {
  const authorsById = new Map(authors.map((author) => [author.id, author]));
  return replies.map((reply) => {
    const author = authorsById.get(reply.user_id);
    return {
      id: reply.id,
      postId: reply.post_id,
      userId: reply.user_id,
      name: author?.full_name ?? "Trader",
      username: author?.username ?? "trader",
      avatar: author?.avatar_url ?? null,
      isVerified: author ? premiumVerified(author) : false,
      content: reply.content,
      createdAt: reply.created_at,
    };
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return serverError("Database ulanmagan.");

  const { id: postId } = await context.params;
  const { data: replies, error } = await supabase
    .from("post_replies")
    .select("id, post_id, user_id, content, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(100)
    .returns<ReplyRecord[]>();

  if (error) return serverError(error.message);

  const authorIds = [...new Set(replies.map((reply) => reply.user_id))];
  const { data: authors, error: authorsError } = authorIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, is_verified, plan, premium_until")
        .in("id", authorIds)
        .returns<ReplyAuthor[]>()
    : { data: [], error: null };

  if (authorsError) return serverError(authorsError.message);
  return Response.json({ replies: mapReplies(replies, authors) });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { id: postId } = await context.params;
  const body = (await request.json()) as { content?: string };
  const content = body.content?.trim();
  if (!content || content.length > 280) {
    return badRequest("Javob 1 dan 280 tagacha belgi bo'lishi kerak.");
  }

  const { data: author, error: authorError } = await auth.supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, is_verified, plan, premium_until")
    .eq("id", auth.user.id)
    .single<ReplyAuthor>();

  if (authorError) return serverError(authorError.message);

  const { data: reply, error } = await auth.supabase
    .from("post_replies")
    .insert({
      post_id: postId,
      user_id: auth.user.id,
      content,
    })
    .select("id, post_id, user_id, content, created_at")
    .single<ReplyRecord>();

  if (error) return serverError(error.message);

  const { data: post } = await auth.supabase
    .from("posts")
    .select("user_id, content")
    .eq("id", postId)
    .maybeSingle();

  if (post?.user_id && post.user_id !== auth.user.id) {
    const actorName = author.full_name || author.username || "A trader";
    await sendSocialNotification(auth.supabase, {
      userId: post.user_id,
      actorId: auth.user.id,
      type: "post_reply",
      message: `${actorName} replied to your trade post: ${content.slice(0, 100)}`,
      entityId: postId,
      entityType: "post",
    });
  }

  return Response.json({ reply: mapReplies([reply], [author])[0] }, { status: 201 });
}
