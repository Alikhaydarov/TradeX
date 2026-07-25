"use client";

import {
  Crown,
  Hash,
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
  onCloseMobile,
}: {
  communityName: string;
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
  onCloseMobile?: () => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [query, setQuery] = useState("");
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
    <div className="flex h-full min-h-0 flex-col bg-[#111214] text-zinc-300">
      <div className="flex h-12 shrink-0 items-center border-b border-black/40 px-3 shadow-[0_1px_0_rgba(255,255,255,.025)]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold tracking-[-0.02em] text-zinc-100">{communityName}</p>
          <p className="mt-0.5 text-[9px] text-zinc-500">Community chat</p>
        </div>
        <span className="grid size-7 place-items-center rounded-md text-zinc-500">
          <MessageCircle size={15} />
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2 scrollbar-thin">
        <section>
          <div className="flex h-7 items-center px-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500">Text channels</p>
            {canManage ? (
              <button
                type="button"
                onClick={() => setCreateOpen((current) => !current)}
                className="ml-auto grid size-6 place-items-center rounded text-zinc-500 transition hover:bg-white/[.06] hover:text-zinc-100"
                aria-label="Create channel"
              >
                {createOpen ? <X size={13} /> : <Plus size={14} />}
              </button>
            ) : null}
          </div>

          {createOpen ? (
            <div className="mb-2 rounded-lg border border-white/[.07] bg-[#17191c] p-2.5">
              <Input
                value={channelName}
                onChange={(event) => setChannelName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void createChannel();
                }}
                placeholder="new-channel"
                className="h-8 rounded-md border-white/[.08] bg-[#0f1012] text-[11px]"
                maxLength={60}
              />
              <label className="mt-2 flex items-center gap-2 text-[10px] text-zinc-500">
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
            {channels.map((channel) => {
              const active = selected?.kind === "channel" && selected.id === channel.id;
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => select({ kind: "channel", id: channel.id })}
                  className={`group relative flex h-8 w-full min-w-0 items-center gap-1.5 rounded-md px-2 text-left transition ${
                    active
                      ? "bg-[#35373c] text-white before:absolute before:-left-2 before:h-5 before:w-1 before:rounded-r-full before:bg-white"
                      : "text-zinc-500 hover:bg-[#2a2c31] hover:text-zinc-200"
                  }`}
                >
                  {channel.isPremiumOnly ? (
                    <LockKeyhole size={14} className="shrink-0 text-amber-400/80" />
                  ) : (
                    <Hash size={16} strokeWidth={2.4} className="shrink-0 text-zinc-500" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{channel.name}</span>
                  {channel.isPremiumOnly ? <Crown size={11} className="shrink-0 text-amber-400/60" /> : null}
                  <UnreadBadge count={channel.unreadCount} />
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-4">
          <div className="flex h-7 items-center px-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500">Direct messages</p>
            <button
              type="button"
              onClick={() => setDmOpen((current) => !current)}
              className="ml-auto grid size-6 place-items-center rounded text-zinc-500 transition hover:bg-white/[.06] hover:text-zinc-100"
              aria-label="Start direct message"
            >
              {dmOpen ? <X size={13} /> : <Plus size={14} />}
            </button>
          </div>

          {dmOpen ? (
            <div className="mb-2 rounded-lg border border-white/[.07] bg-[#17191c] p-2.5">
              <div className="flex h-8 items-center gap-2 rounded-md border border-white/[.07] bg-[#0f1012] px-2">
                <Search size={12} className="text-zinc-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find a member"
                  className="min-w-0 flex-1 bg-transparent text-[11px] text-zinc-100 outline-none placeholder:text-zinc-600"
                />
              </div>
              <div className="mt-1.5 max-h-44 space-y-0.5 overflow-y-auto">
                {availableMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void startDm(member.id)}
                    className="flex h-9 w-full items-center gap-2 rounded-md px-1.5 text-left text-zinc-400 transition hover:bg-white/[.055] hover:text-white"
                  >
                    <TraderAvatar name={member.fullName} value={member.avatarUrl} className="size-6 rounded-full text-[8px]" />
                    <span className="min-w-0 flex-1 truncate text-[11px]">{member.fullName}</span>
                  </button>
                ))}
                {!availableMembers.length ? (
                  <p className="py-3 text-center text-[10px] text-zinc-600">No members available</p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-0.5">
            {dms.map((thread) => {
              const active = selected?.kind === "dm" && selected.id === thread.id;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => select({ kind: "dm", id: thread.id })}
                  className={`group relative flex h-9 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left transition ${
                    active
                      ? "bg-[#35373c] text-white before:absolute before:-left-2 before:h-5 before:w-1 before:rounded-r-full before:bg-white"
                      : "text-zinc-500 hover:bg-[#2a2c31] hover:text-zinc-200"
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
            {!dms.length ? (
              <div className="flex items-center gap-2 rounded-md px-2 py-3 text-[10px] text-zinc-600">
                <UsersRound size={13} /> Start a private conversation
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="flex h-[52px] shrink-0 items-center gap-2 border-t border-black/35 bg-[#0b0c0e] px-2.5">
        <div className="relative shrink-0">
          <TraderAvatar name={currentUser.fullName} value={currentUser.avatarUrl} className="size-8 rounded-full text-[9px]" />
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#0b0c0e] bg-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold text-zinc-100">{currentUser.fullName}</p>
          <p className="truncate text-[9px] text-zinc-500">@{currentUser.username}</p>
        </div>
        <span className="grid size-7 place-items-center rounded-md text-emerald-400/80">
          <MessageCircle size={14} />
        </span>
      </div>
    </div>
  );
}
