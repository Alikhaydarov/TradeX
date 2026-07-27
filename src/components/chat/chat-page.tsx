"use client";

import { LoaderCircle, MessageCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useRealtimeChannel } from "@/features/community-chat/hooks/use-realtime-channel";
import type {
  ChatChannel,
  ChatContextPayload,
  ChatDmThread,
  ChatProfile,
  ChatReplyPreview,
} from "@/features/community-chat/types";
import { ChatHeader } from "./chat-header";
import { ChatSidebar, type SelectedChatRoom } from "./chat-sidebar";
import { MemberPanel } from "./member-panel";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";

interface CommunityMemberPayload {
  members?: Array<{
    user_id: string;
    status: string;
    profile: {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
      is_verified: boolean | null;
    } | null;
  }>;
}

function memberProfile(
  member: NonNullable<CommunityMemberPayload["members"]>[number],
): ChatProfile | null {
  if (!member.profile || member.status !== "active") return null;
  return {
    id: member.profile.id || member.user_id,
    username: member.profile.username || "trader",
    fullName: member.profile.full_name || member.profile.username || "Trader",
    avatarUrl: member.profile.avatar_url || null,
    isVerified: Boolean(member.profile.is_verified),
  };
}

function roomFromUrl(): SelectedChatRoom | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const channelId = params.get("channel");
  const dmId = params.get("dm");
  if (channelId) return { kind: "channel", id: channelId };
  if (dmId) return { kind: "dm", id: dmId };
  return null;
}

function roomHref(communityId: string, room: SelectedChatRoom) {
  const params = new URLSearchParams();
  params.set(room.kind === "channel" ? "channel" : "dm", room.id);
  return `/community/${communityId}/chat?${params.toString()}`;
}

function ChatRoomPanel({
  context,
  room,
  members,
  onOpenSidebar,
}: {
  context: ChatContextPayload;
  room: SelectedChatRoom;
  members: ChatProfile[];
  onOpenSidebar: () => void;
}) {
  const [reply, setReply] = useState<ChatReplyPreview | null>(null);
  const [actionError, setActionError] = useState("");
  const [membersOpen, setMembersOpen] = useState(true);
  const realtime = useRealtimeChannel({
    roomKind: room.kind,
    roomId: room.id,
    currentUser: context.currentUser,
  });
  const channel =
    room.kind === "channel"
      ? context.channels.find((item) => item.id === room.id) || null
      : null;
  const dm =
    room.kind === "dm"
      ? context.dms.find((item) => item.id === room.id) || null
      : null;
  const roomTitle = channel
    ? channel.name
    : dm?.peer.fullName || "Direct message";
  const roomSubtitle = channel
    ? channel.isPremiumOnly
      ? "Premium members only"
      : context.community.description || `${context.community.name} channel`
    : dm
      ? `Direct message with @${dm.peer.username}`
      : "Conversation";
  const canModerate = context.isOwner || context.role === "admin";

  const run = async (task: () => Promise<void>) => {
    setActionError("");
    try {
      await task();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Chat action failed.",
      );
    }
  };

  return (
    <div className="flex h-full min-h-0 bg-[#090909]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatHeader
          roomKind={room.kind}
          title={roomTitle}
          subtitle={roomSubtitle}
          onlineCount={realtime.onlineUsers.length}
          connection={realtime.connection}
          membersOpen={membersOpen}
          onOpenSidebar={onOpenSidebar}
          onToggleMembers={() => setMembersOpen((current) => !current)}
        />
        {actionError || realtime.error ? (
          <div className="flex items-center gap-2 border-b border-rose-400/10 bg-rose-400/[.045] px-4 py-2 text-[10px] text-rose-300">
            <X size={12} /> {actionError || realtime.error}
          </div>
        ) : null}
        <MessageList
          messages={realtime.messages}
          currentUserId={context.currentUser.id}
          canModerate={canModerate}
          loading={realtime.loading}
          loadingOlder={realtime.loadingOlder}
          hasOlder={realtime.hasOlder}
          typingUsers={realtime.typingUsers}
          onLoadOlder={realtime.loadOlder}
          onRead={realtime.markRead}
          onReply={setReply}
          onEdit={(messageId, content) =>
            realtime.editMessage(messageId, content).then(() => undefined)
          }
          onDelete={(messageId) =>
            run(() => realtime.deleteMessage(messageId))
          }
          onReact={(messageId, emoji) =>
            run(() => realtime.react(messageId, emoji))
          }
        />
        <MessageInput
          roomLabel={room.kind === "channel" ? `#${roomTitle}` : roomTitle}
          reply={reply}
          rateLimitedUntil={realtime.rateLimitedUntil}
          onReplyClear={() => setReply(null)}
          onTyping={realtime.setTyping}
          onSend={realtime.sendMessage}
        />
      </div>
      {membersOpen ? (
        <div className="hidden h-full min-h-0 xl:block">
          <MemberPanel
            members={members}
            onlineUsers={realtime.onlineUsers}
            currentUserId={context.currentUser.id}
            currentUserIsModerator={canModerate}
            onClose={() => setMembersOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

export function ChatPage({ communityId }: { communityId: string }) {
  const router = useRouter();
  const [context, setContext] = useState<ChatContextPayload | null>(null);
  const [members, setMembers] = useState<ChatProfile[]>([]);
  const [selected, setSelected] = useState<SelectedChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const chooseRoom = useCallback(
    (room: SelectedChatRoom) => {
      setSelected(room);
      router.replace(roomHref(communityId, room), { scroll: false });
    },
    [communityId, router],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [contextResponse, membersResponse] = await Promise.all([
        fetch(
          `/api/community-chat/context?communityId=${encodeURIComponent(communityId)}`,
          { cache: "no-store", credentials: "same-origin" },
        ),
        fetch(`/api/communities/${encodeURIComponent(communityId)}`, {
          cache: "no-store",
          credentials: "same-origin",
        }),
      ]);
      const contextPayload = (await contextResponse
        .json()
        .catch(() => null)) as (ChatContextPayload & { error?: string }) | null;
      const memberPayload = (await membersResponse
        .json()
        .catch(() => null)) as
        | (CommunityMemberPayload & { error?: string })
        | null;
      if (!contextResponse.ok || !contextPayload) {
        throw new Error(
          contextPayload?.error || "Community chat could not be loaded.",
        );
      }

      setContext(contextPayload);
      setMembers(
        (memberPayload?.members ?? [])
          .map(memberProfile)
          .filter((profile): profile is ChatProfile => Boolean(profile)),
      );

      const requested = roomFromUrl();
      const validRequested =
        requested &&
        (requested.kind === "channel"
          ? contextPayload.channels.some(
              (channel) => channel.id === requested.id,
            )
          : contextPayload.dms.some((dm) => dm.id === requested.id));
      const fallback: SelectedChatRoom | null = contextPayload.channels[0]
        ? { kind: "channel", id: contextPayload.channels[0].id }
        : contextPayload.dms[0]
          ? { kind: "dm", id: contextPayload.dms[0].id }
          : null;
      const next = validRequested ? requested : fallback;
      setSelected(next);
      if (next) {
        router.replace(roomHref(communityId, next), { scroll: false });
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Community chat could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [communityId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const createChannel = async (name: string, isPremiumOnly: boolean) => {
    const response = await fetch("/api/community-chat/channels", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId, name, isPremiumOnly }),
    });
    const payload = (await response.json().catch(() => null)) as {
      channel?: ChatChannel;
      error?: string;
    } | null;
    if (!response.ok || !payload?.channel) {
      throw new Error(payload?.error || "Channel could not be created.");
    }
    setContext((current) =>
      current
        ? { ...current, channels: [...current.channels, payload.channel!] }
        : current,
    );
    chooseRoom({ kind: "channel", id: payload.channel.id });
  };

  const startDm = async (peerUserId: string) => {
    const response = await fetch("/api/community-chat/dms", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ peerUserId }),
    });
    const payload = (await response.json().catch(() => null)) as {
      thread?: ChatDmThread;
      error?: string;
    } | null;
    if (!response.ok || !payload?.thread) {
      throw new Error(payload?.error || "Direct message could not be opened.");
    }
    setContext((current) => {
      if (!current) return current;
      const exists = current.dms.some((dm) => dm.id === payload.thread!.id);
      return {
        ...current,
        dms: exists ? current.dms : [payload.thread!, ...current.dms],
      };
    });
    chooseRoom({ kind: "dm", id: payload.thread.id });
  };

  const back = () => router.push(`/community/${communityId}/overview`);

  const sidebar = context ? (
    <ChatSidebar
      communityName={context.community.name}
      communityAvatar={context.community.avatarUrl}
      currentUser={context.currentUser}
      channels={context.channels}
      dms={context.dms}
      members={members}
      selected={selected}
      canManage={context.isOwner || context.role === "admin"}
      currentUserId={context.currentUser.id}
      onSelect={chooseRoom}
      onCreateChannel={createChannel}
      onStartDm={startDm}
      onCommunityHome={back}
      onCloseMobile={() => setMobileSidebarOpen(false)}
    />
  ) : null;

  if (loading) {
    return (
      <div className="grid h-full min-h-0 place-items-center bg-[#090909] text-zinc-500">
        <LoaderCircle size={22} className="animate-spin" />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="grid h-full min-h-0 place-items-center bg-[#090909] p-4 text-center">
        <div className="max-w-sm rounded-xl border border-white/[.07] bg-[#111214] p-5">
          <MessageCircle size={22} className="mx-auto text-zinc-600" />
          <h1 className="mt-3 text-sm font-bold text-white">
            Chat unavailable
          </h1>
          <p className="mt-1 text-[11px] leading-5 text-zinc-500">
            {error || "Apply the community chat migration and try again."}
          </p>
          <Button
            type="button"
            onClick={back}
            className="mt-3 h-8 text-[10px]"
          >
            Back to community
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-community-chat
      className="relative flex h-dvh min-h-0 overflow-hidden bg-[#090909] lg:h-[calc(100dvh-2rem)]"
    >
      <aside className="hidden w-[264px] shrink-0 border-r border-black/35 lg:block">
        {sidebar}
      </aside>
      <main className="min-h-0 min-w-0 flex-1">
        {selected ? (
          <ChatRoomPanel
            key={`${selected.kind}:${selected.id}`}
            context={context}
            room={selected}
            members={members}
            onOpenSidebar={() => setMobileSidebarOpen(true)}
          />
        ) : (
          <div className="grid h-full place-items-center bg-[#090909] text-center">
            <div>
              <MessageCircle size={28} className="mx-auto text-zinc-600" />
              <p className="mt-2 text-xs text-zinc-500">
                Create or select a channel to start chatting.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMobileSidebarOpen(true)}
                className="mt-3 h-8 text-[10px] lg:hidden"
              >
                Open channels
              </Button>
            </div>
          </div>
        )}
      </main>

      {mobileSidebarOpen ? (
        <div className="absolute inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(280px,88vw)] border-r border-black/40 bg-[#111214] shadow-2xl">
            {sidebar}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
