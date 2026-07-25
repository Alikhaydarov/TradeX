import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiAuth } from "./auth";
import { getPremiumStatus } from "./premium";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ChatMessage,
  ChatProfile,
  ChatReaction,
  ChatReplyPreview,
} from "@/features/community-chat/types";

export const CHAT_PAGE_SIZE = 30;
export const CHAT_RATE_WINDOW_SECONDS = 10;
export const CHAT_RATE_MAX_MESSAGES = 8;

export interface RawMessageRow {
  id: string;
  channel_id: string | null;
  dm_thread_id: string | null;
  sender_id: string;
  content: string;
  client_id: string | null;
  reply_to_message_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
}

export function chatAdmin(): SupabaseClient {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("Community chat service is unavailable.");
  return admin;
}

export function profileFrom(row: ProfileRow | null | undefined, userId: string): ChatProfile {
  return {
    id: userId,
    username: row?.username || "trader",
    fullName: row?.full_name || row?.username || "Trader",
    avatarUrl: row?.avatar_url || null,
    isVerified: Boolean(row?.is_verified),
  };
}

export async function requireCommunityAccess(
  admin: SupabaseClient,
  communityId: string,
  userId: string,
) {
  const community = await admin
    .from("communities")
    .select("id, owner_id, name, slug, description, avatar_url")
    .eq("id", communityId)
    .maybeSingle();
  if (community.error) throw new Error(community.error.message);
  if (!community.data) return null;

  if (community.data.owner_id === userId) {
    return { community: community.data, role: "owner" as const, isOwner: true };
  }

  const membership = await admin
    .from("community_members")
    .select("role, status, muted_until, banned")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (membership.error) throw new Error(membership.error.message);
  if (!membership.data || membership.data.banned) return null;

  const role = membership.data.role === "admin" ? "admin" : "member";
  return {
    community: community.data,
    role: role as "admin" | "member",
    isOwner: false,
    mutedUntil: membership.data.muted_until as string | null,
  };
}

export async function requireChannelAccess(
  auth: ApiAuth,
  channelId: string,
  options: { write?: boolean } = {},
) {
  const admin = chatAdmin();
  const channel = await admin
    .from("channels")
    .select("id, community_id, name, is_premium_only, position, created_at")
    .eq("id", channelId)
    .maybeSingle();
  if (channel.error) throw new Error(channel.error.message);
  if (!channel.data?.community_id) return null;

  const access = await requireCommunityAccess(admin, channel.data.community_id, auth.user.id);
  if (!access) return null;

  if (channel.data.is_premium_only) {
    const premium = await getPremiumStatus(auth);
    if (!premium.isPremium) return null;
  }

  if (options.write && !access.isOwner) {
    const membership = await admin
      .from("community_members")
      .select("muted_until, banned, status")
      .eq("community_id", channel.data.community_id)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (membership.error) throw new Error(membership.error.message);
    if (!membership.data || membership.data.status !== "active" || membership.data.banned) return null;
    if (membership.data.muted_until && new Date(membership.data.muted_until).getTime() > Date.now()) {
      return { ...access, channel: channel.data, muted: true as const };
    }
  }

  return { ...access, channel: channel.data, muted: false as const };
}

export async function requireDmAccess(admin: SupabaseClient, threadId: string, userId: string) {
  const thread = await admin
    .from("dm_threads")
    .select("id, user_one_id, user_two_id, created_at")
    .eq("id", threadId)
    .maybeSingle();
  if (thread.error) throw new Error(thread.error.message);
  if (!thread.data || ![thread.data.user_one_id, thread.data.user_two_id].includes(userId)) return null;
  return thread.data;
}

export function encodeCursor(row: Pick<RawMessageRow, "created_at" | "id">): string {
  return Buffer.from(JSON.stringify({ createdAt: row.created_at, id: row.id }), "utf8").toString("base64url");
}

export function decodeCursor(value: string | null): { createdAt: string; id: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      createdAt?: unknown;
      id?: unknown;
    };
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string") return null;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

export async function enforceMessageRateLimit(admin: SupabaseClient, userId: string) {
  const since = new Date(Date.now() - CHAT_RATE_WINDOW_SECONDS * 1000).toISOString();
  const recent = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", userId)
    .gte("created_at", since);
  if (recent.error) throw new Error(recent.error.message);
  return (recent.count ?? 0) < CHAT_RATE_MAX_MESSAGES;
}

export async function hydrateMessages(
  admin: SupabaseClient,
  rows: RawMessageRow[],
  currentUserId: string,
): Promise<ChatMessage[]> {
  if (!rows.length) return [];

  const senderIds = [...new Set(rows.map((row) => row.sender_id))];
  const replyIds = [...new Set(rows.map((row) => row.reply_to_message_id).filter((id): id is string => Boolean(id)))];
  const messageIds = rows.map((row) => row.id);

  const [profilesResult, reactionsResult, repliesResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, username, full_name, avatar_url, is_verified")
      .in("id", senderIds),
    admin
      .from("message_reactions")
      .select("message_id, user_id, emoji")
      .in("message_id", messageIds),
    replyIds.length
      ? admin
          .from("messages")
          .select("id, sender_id, content, deleted_at")
          .in("id", replyIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [profilesResult, reactionsResult, repliesResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const replySenderIds = [
    ...new Set((repliesResult.data ?? []).map((reply) => reply.sender_id as string)),
  ].filter((id) => !senderIds.includes(id));
  const replyProfiles = replySenderIds.length
    ? await admin
        .from("profiles")
        .select("id, username, full_name, avatar_url, is_verified")
        .in("id", replySenderIds)
    : { data: [], error: null };
  if (replyProfiles.error) throw new Error(replyProfiles.error.message);

  const profileMap = new Map<string, ProfileRow>();
  for (const profile of [...(profilesResult.data ?? []), ...(replyProfiles.data ?? [])]) {
    profileMap.set(profile.id, profile as ProfileRow);
  }

  const replyMap = new Map<string, ChatReplyPreview>();
  for (const reply of repliesResult.data ?? []) {
    const sender = profileFrom(profileMap.get(reply.sender_id as string), reply.sender_id as string);
    replyMap.set(reply.id as string, {
      id: reply.id as string,
      content: reply.deleted_at ? "Message deleted" : String(reply.content || ""),
      senderName: sender.fullName,
      deleted: Boolean(reply.deleted_at),
    });
  }

  const reactionMap = new Map<string, Map<string, { count: number; reactedByMe: boolean }>>();
  for (const reaction of reactionsResult.data ?? []) {
    const messageId = reaction.message_id as string;
    const emoji = String(reaction.emoji);
    const byEmoji = reactionMap.get(messageId) ?? new Map();
    const current = byEmoji.get(emoji) ?? { count: 0, reactedByMe: false };
    current.count += 1;
    if (reaction.user_id === currentUserId) current.reactedByMe = true;
    byEmoji.set(emoji, current);
    reactionMap.set(messageId, byEmoji);
  }

  return rows.map((row) => {
    const reactions: ChatReaction[] = [...(reactionMap.get(row.id)?.entries() ?? [])].map(
      ([emoji, state]) => ({ emoji, ...state }),
    );
    return {
      id: row.id,
      channelId: row.channel_id,
      dmThreadId: row.dm_thread_id,
      senderId: row.sender_id,
      sender: profileFrom(profileMap.get(row.sender_id), row.sender_id),
      content: row.deleted_at ? "" : row.content,
      clientId: row.client_id,
      replyToMessageId: row.reply_to_message_id,
      reply: row.reply_to_message_id ? replyMap.get(row.reply_to_message_id) ?? null : null,
      reactions,
      editedAt: row.edited_at,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
    };
  });
}
