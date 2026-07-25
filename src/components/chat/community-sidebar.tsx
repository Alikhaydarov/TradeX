"use client";

import {
  Crown,
  Hash,
  LockKeyhole,
  MessageCircle,
  Plus,
  Search,
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
    <div className="flex h-full min-h-0 flex-col bg-[#050505]">
      <div className="flex h-12 items-center border-b border-white/8 px-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-zinc-200">Conversations</p>
          <p className="mt-0.5 text-[8px] text-zinc-700">Channels and direct messages</p>
        </div>
        <MessageCircle size={15} className="text-zinc-700" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        <section>
          <div className="flex h-7 items-center px-1.5">
            <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-zinc-700">Channels</p>
            {canManage ? (
              <button
                type="button"
                onClick={() => setCreateOpen((current) => !current)}
                className="ml-auto grid size-6 place-items-center rounded-md text-zinc-700 transition hover:bg-white/[.05] hover:text-white"
                aria-label="Create channel"
              >
                {createOpen ? <X size={12} /> : <Plus size={12} />}
              </button>
            ) : null}
          </div>

          {createOpen ? (
            <div className="mb-2 rounded-xl border border-white/8 bg-[#080808] p-2.5">
              <Input
                value={channelName}
                onChange={(event) => setChannelName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void createChannel();
                }}
                placeholder="channel-name"
                className="h-8 border-white/10 bg-[#050505] text-[10px]"
                maxLength={60}
              />
              <label className="mt-2 flex items-center gap-2 text-[9px] text-zinc-600">
                <input
                  type="checkbox"
                  checked={premiumOnly}
                  onChange={(event) => setPremiumOnly(event.target.checked)}
                  className="size-3 accent-white"
                />
                Premium members only
              </label>
              <Button
                type="button"
                onClick={() => void createChannel()}
                disabled={busy || !channelName.trim()}
                className="mt-2 h-7 w-full rounded-lg bg-white text-[9px] font-bold text-black hover:bg-zinc-200"
              >
                <Plus size={11} /> Create channel
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
                  className={`flex h-9 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-left transition ${
                    active
                      ? "bg-white/[.085] text-white ring-1 ring-white/9"
                      : "text-zinc-600 hover:bg-white/[.04] hover:text-zinc-300"
                  }`}
                >
                  {channel.isPremiumOnly ? <LockKeyhole size={12} className="shrink-0 text-amber-500/70" /> : <Hash size={13} className="shrink-0" />}
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{channel.name}</span>
                  {channel.isPremiumOnly ? <Crown size={10} className="shrink-0 text-amber-500/60" /> : null}
                  <UnreadBadge count={channel.unreadCount} />
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-3 border-t border-white/[.055] pt-2">
          <div className="flex h-7 items-center px-1.5">
            <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-zinc-700">Direct messages</p>
            <button
              type="button"
              onClick={() => setDmOpen((current) => !current)}
              className="ml-auto grid size-6 place-items-center rounded-md text-zinc-700 transition hover:bg-white/[.05] hover:text-white"
              aria-label="Start direct message"
            >
              {dmOpen ? <X size={12} /> : <Plus size={12} />}
            </button>
          </div>

          {dmOpen ? (
            <div className="mb-2 rounded-xl border border-white/8 bg-[#080808] p-2.5">
              <div className="flex h-8 items-center gap-1.5 rounded-lg border border-white/8 bg-[#050505] px-2">
                <Search size={11} className="text-zinc-700" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find member"
                  className="min-w-0 flex-1 bg-transparent text-[10px] text-white outline-none placeholder:text-zinc-800"
                />
              </div>
              <div className="mt-1 max-h-40 space-y-0.5 overflow-y-auto">
                {availableMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void startDm(member.id)}
                    className="flex h-8 w-full items-center gap-2 rounded-md px-1.5 text-left text-zinc-500 transition hover:bg-white/[.04] hover:text-white"
                  >
                    <TraderAvatar name={member.fullName} value={member.avatarUrl} className="size-6 rounded-md text-[8px]" />
                    <span className="min-w-0 flex-1 truncate text-[10px]">{member.fullName}</span>
                  </button>
                ))}
                {!availableMembers.length ? <p className="py-3 text-center text-[9px] text-zinc-800">No members available</p> : null}
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
                  className={`flex h-9 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-left transition ${
                    active
                      ? "bg-white/[.085] text-white ring-1 ring-white/9"
                      : "text-zinc-600 hover:bg-white/[.04] hover:text-zinc-300"
                  }`}
                >
                  <div className="relative shrink-0">
                    <TraderAvatar name={thread.peer.fullName} value={thread.peer.avatarUrl} className="size-6 rounded-md text-[8px]" />
                    <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-[#050505] bg-zinc-700" />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-[10px] font-medium">{thread.peer.fullName}</span>
                  <UnreadBadge count={thread.unreadCount} />
                </button>
              );
            })}
            {!dms.length ? (
              <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-[9px] text-zinc-800">
                <MessageCircle size={12} /> No direct messages
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
