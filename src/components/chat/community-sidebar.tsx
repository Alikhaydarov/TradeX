"use client";

import {
  Crown,
  Hash,
  Home,
  LockKeyhole,
  MessageCircle,
  Plus,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  ChatChannel,
  ChatDmThread,
  ChatProfile,
  ChatRoomKind,
} from "@/features/community-chat/types";
import { TraderAvatar } from "@/components/trader-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UnreadBadge } from "./unread-badge";

export interface SelectedChatRoom {
  kind: ChatRoomKind;
  id: string;
}

export function CommunityChatSidebar({
  communityName,
  communityAvatar,
  currentUser,
  channels,
  dms,
  members,
  selected,
  canManage,
  currentUserId,
  onSelect,
  onCreateChannel,
  onStartDm,
  onCommunityHome,
  onCloseMobile,
}: {
  communityName: string;
  communityAvatar: string | null;
  currentUser: ChatProfile;
  channels: ChatChannel[];
  dms: ChatDmThread[];
  members: ChatProfile[];
  selected: SelectedChatRoom | null;
  canManage: boolean;
  currentUserId: string;
  onSelect: (room: SelectedChatRoom) => void;
  onCreateChannel: (name: string, premiumOnly: boolean) => Promise<void>;
  onStartDm: (userId: string) => Promise<void>;
  onCommunityHome: () => void;
  onCloseMobile?: () => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const dmPeerIds = useMemo(() => new Set(dms.map((thread) => thread.peer.id)), [dms]);
  const availableMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return members
      .filter((member) => member.id !== currentUserId && !dmPeerIds.has(member.id))
      .filter((member) =>
        !normalized
          ? true
          : `${member.fullName} ${member.username}`.toLowerCase().includes(normalized),
      );
  }, [currentUserId, dmPeerIds, members, query]);
  const normalizedSidebarQuery = sidebarQuery.trim().toLowerCase();
  const visibleChannels = useMemo(
    () =>
      channels.filter((channel) =>
        normalizedSidebarQuery
          ? channel.name.toLowerCase().includes(normalizedSidebarQuery)
          : true,
      ),
    [channels, normalizedSidebarQuery],
  );
  const publicChannels = visibleChannels.filter((channel) => !channel.isPremiumOnly);
  const premiumChannels = visibleChannels.filter((channel) => channel.isPremiumOnly);
  const visibleDms = useMemo(
    () =>
      dms.filter((thread) =>
        normalizedSidebarQuery
          ? `${thread.peer.fullName} ${thread.peer.username}`
              .toLowerCase()
              .includes(normalizedSidebarQuery)
          : true,
      ),
    [dms, normalizedSidebarQuery],
  );

  const select = (room: SelectedChatRoom) => {
    onSelect(room);
    onCloseMobile?.();
  };

  const createChannel = async () => {
    if (busy || channelName.trim().length < 1) return;
    setBusy(true);
    try {
      await onCreateChannel(channelName, premiumOnly);
      setChannelName("");
      setPremiumOnly(false);
      setCreateOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const startDm = async (userId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await onStartDm(userId);
      setDmOpen(false);
      setQuery("");
      onCloseMobile?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-raised text-ink-strong">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-black/40 px-3 shadow-[0_1px_0_rgba(255,255,255,.025)]">
        <TraderAvatar
          name={communityName}
          value={communityAvatar}
          className="size-8 rounded-[10px] border border-white/[.09] text-[10px]"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold tracking-[-0.02em] text-zinc-100">{communityName}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-ink-mute">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Trader community
          </p>
        </div>
        {onCloseMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            className="grid size-7 place-items-center rounded-md text-ink-mute transition hover:bg-white/[.06] hover:text-white lg:hidden"
            aria-label="Close channels"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      <div className="shrink-0 space-y-1.5 px-2 pt-2">
        <button
          type="button"
          onClick={onCommunityHome}
          className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-[11px] font-semibold text-ink-soft transition hover:bg-white/[.055] hover:text-white"
        >
          <span className="grid size-6 place-items-center rounded-md bg-white/[.04] text-ink-mute">
            <Home size={13} />
          </span>
          Community overview
        </button>
        <label className="flex h-8 items-center gap-2 rounded-md border border-white/[.065] bg-surface px-2.5 transition focus-within:border-white/[.15]">
          <Search size={12} className="text-ink-subtle" />
          <input
            value={sidebarQuery}
            onChange={(event) => setSidebarQuery(event.target.value)}
            placeholder="Find channels or people"
            className="min-w-0 flex-1 bg-transparent text-[10px] text-zinc-200 outline-none placeholder:text-ink-faint"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2 scrollbar-thin">
        <section>
          <div className="flex h-7 items-center px-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-mute">Channels</p>
            {canManage ? (
              <button
                type="button"
                onClick={() => setCreateOpen((current) => !current)}
                className="ml-auto grid size-6 place-items-center rounded text-ink-mute transition hover:bg-white/[.06] hover:text-zinc-100"
                aria-label="Create channel"
              >
                {createOpen ? <X size={13} /> : <Plus size={14} />}
              </button>
            ) : null}
          </div>

          {createOpen ? (
            <div className="mb-2 rounded-lg border border-white/[.07] bg-surface-raised p-2.5">
              <Input
                value={channelName}
                onChange={(event) => setChannelName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void createChannel();
                }}
                placeholder="new-channel"
                className="h-8 rounded-md border-white/[.08] bg-surface text-[11px]"
                maxLength={60}
              />
              <label className="mt-2 flex items-center gap-2 text-[10px] text-ink-mute">
                <input
                  type="checkbox"
                  checked={premiumOnly}
                  onChange={(event) => setPremiumOnly(event.target.checked)}
                  className="size-3.5 accent-white"
                />
                Premium members only
              </label>
              <Button
                type="button"
                onClick={() => void createChannel()}
                disabled={busy || !channelName.trim()}
                className="mt-2 h-8 w-full rounded-md bg-white text-[10px] font-bold text-black hover:bg-zinc-200"
              >
                <Plus size={12} /> Create channel
              </Button>
            </div>
          ) : null}

          <div className="space-y-0.5">
            {publicChannels.map((channel) => {
              const active = selected?.kind === "channel" && selected.id === channel.id;
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => select({ kind: "channel", id: channel.id })}
                  className={`group relative flex h-8 w-full min-w-0 items-center gap-1.5 rounded-md px-2 text-left transition ${
                    active
                      ? "bg-[#35373c] text-white before:absolute before:-left-2 before:h-5 before:w-1 before:rounded-r-full before:bg-white"
                      : "text-ink-mute hover:bg-[#2a2c31] hover:text-zinc-200"
                  }`}
                >
                  {channel.isPremiumOnly ? (
                    <LockKeyhole size={14} className="shrink-0 text-amber-400/80" />
                  ) : (
                    <Hash size={16} strokeWidth={2.4} className="shrink-0 text-ink-mute" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{channel.name}</span>
                  {channel.isPremiumOnly ? <Crown size={11} className="shrink-0 text-amber-400/60" /> : null}
                  <UnreadBadge count={channel.unreadCount} />
                </button>
              );
            })}
            {premiumChannels.length ? (
              <p className="px-2 pb-1 pt-3 text-[8px] font-bold uppercase tracking-[.12em] text-amber-400/45">
                Premium rooms
              </p>
            ) : null}
            {premiumChannels.map((channel) => {
              const active = selected?.kind === "channel" && selected.id === channel.id;
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => select({ kind: "channel", id: channel.id })}
                  className={`group relative flex h-8 w-full min-w-0 items-center gap-1.5 rounded-md px-2 text-left transition ${
                    active
                      ? "bg-[#35373c] text-white before:absolute before:-left-2 before:h-5 before:w-1 before:rounded-r-full before:bg-amber-300"
                      : "text-ink-mute hover:bg-[#2a2c31] hover:text-zinc-200"
                  }`}
                >
                  <LockKeyhole size={14} className="shrink-0 text-amber-400/80" />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{channel.name}</span>
                  <Crown size={11} className="shrink-0 text-amber-400/60" />
                  <UnreadBadge count={channel.unreadCount} />
                </button>
              );
            })}
            {!visibleChannels.length && normalizedSidebarQuery ? (
              <p className="px-2 py-3 text-[10px] text-ink-subtle">No matching channels</p>
            ) : null}
          </div>
        </section>

        <section className="mt-4">
          <div className="flex h-7 items-center px-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-mute">Direct messages</p>
            <button
              type="button"
              onClick={() => setDmOpen((current) => !current)}
              className="ml-auto grid size-6 place-items-center rounded text-ink-mute transition hover:bg-white/[.06] hover:text-zinc-100"
              aria-label="Start direct message"
            >
              {dmOpen ? <X size={13} /> : <Plus size={14} />}
            </button>
          </div>

          {dmOpen ? (
            <div className="mb-2 rounded-lg border border-white/[.07] bg-surface-raised p-2.5">
              <div className="flex h-8 items-center gap-2 rounded-md border border-white/[.07] bg-surface px-2">
                <Search size={12} className="text-ink-mute" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find a member"
                  className="min-w-0 flex-1 bg-transparent text-[11px] text-zinc-100 outline-none placeholder:text-ink-subtle"
                />
              </div>
              <div className="mt-1.5 max-h-44 space-y-0.5 overflow-y-auto">
                {availableMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void startDm(member.id)}
                    className="flex h-9 w-full items-center gap-2 rounded-md px-1.5 text-left text-ink-soft transition hover:bg-white/[.055] hover:text-white"
                  >
                    <TraderAvatar name={member.fullName} value={member.avatarUrl} className="size-6 rounded-full text-[8px]" />
                    <span className="min-w-0 flex-1 truncate text-[11px]">{member.fullName}</span>
                  </button>
                ))}
                {!availableMembers.length ? (
                  <p className="py-3 text-center text-[10px] text-ink-subtle">No members available</p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-0.5">
            {visibleDms.map((thread) => {
              const active = selected?.kind === "dm" && selected.id === thread.id;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => select({ kind: "dm", id: thread.id })}
                  className={`group relative flex h-9 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left transition ${
                    active
                      ? "bg-[#35373c] text-white before:absolute before:-left-2 before:h-5 before:w-1 before:rounded-r-full before:bg-white"
                      : "text-ink-mute hover:bg-[#2a2c31] hover:text-zinc-200"
                  }`}
                >
                  <div className="relative shrink-0">
                    <TraderAvatar name={thread.peer.fullName} value={thread.peer.avatarUrl} className="size-7 rounded-full text-[8px]" />
                    <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#111214] bg-zinc-600" />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{thread.peer.fullName}</span>
                  <UnreadBadge count={thread.unreadCount} />
                </button>
              );
            })}
            {!visibleDms.length && !normalizedSidebarQuery ? (
              <div className="flex items-center gap-2 rounded-md px-2 py-3 text-[10px] text-ink-subtle">
                <UsersRound size={13} /> Start a private conversation
              </div>
            ) : null}
            {!visibleDms.length && normalizedSidebarQuery ? (
              <p className="px-2 py-3 text-[10px] text-ink-subtle">No matching conversations</p>
            ) : null}
          </div>
        </section>
      </div>

      <div className="flex h-[52px] shrink-0 items-center gap-2 border-t border-black/35 bg-surface px-2.5">
        <div className="relative shrink-0">
          <TraderAvatar name={currentUser.fullName} value={currentUser.avatarUrl} className="size-8 rounded-full text-[10px]" />
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#0b0c0e] bg-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold text-zinc-100">{currentUser.fullName}</p>
          <p className="truncate text-[10px] text-ink-mute">@{currentUser.username}</p>
        </div>
        <span className="grid size-7 place-items-center rounded-md text-emerald-400/80">
          <MessageCircle size={14} />
        </span>
      </div>
    </div>
  );
}
