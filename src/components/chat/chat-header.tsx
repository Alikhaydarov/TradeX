"use client";

import {
  Hash,
  Menu,
  MessageCircle,
  PanelRightClose,
  PanelRightOpen,
  UsersRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { ChatRoomKind } from "@/features/community-chat/types";
import { Button } from "@/components/ui/button";

export function ChatHeader({
  roomKind,
  title,
  subtitle,
  onlineCount,
  connection,
  membersOpen,
  onOpenSidebar,
  onToggleMembers,
}: {
  roomKind: ChatRoomKind;
  title: string;
  subtitle: string;
  onlineCount: number;
  connection: "connecting" | "connected" | "offline";
  membersOpen: boolean;
  onOpenSidebar: () => void;
  onToggleMembers: () => void;
}) {
  const live = connection === "connected";

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/[.075] bg-surface/95 px-2.5 shadow-[0_1px_0_rgba(255,255,255,.025)] backdrop-blur-xl sm:px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onOpenSidebar}
        className="text-ink-soft hover:bg-white/[.06] hover:text-white lg:hidden"
        aria-label="Open chat sidebar"
      >
        <Menu size={17} />
      </Button>

      <span className="grid size-7 shrink-0 place-items-center text-ink-mute">
        {roomKind === "channel" ? <Hash size={20} strokeWidth={2.4} /> : <MessageCircle size={18} />}
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <h1 className="truncate text-[14px] font-bold tracking-[-0.015em] text-zinc-100">{title}</h1>
        <span className="hidden h-5 w-px bg-white/[.07] sm:block" />
        <p className="hidden min-w-0 truncate text-[10px] text-ink-mute sm:block">{subtitle}</p>
      </div>

      <button
        type="button"
        onClick={onToggleMembers}
        className={`hidden h-8 items-center gap-1.5 rounded-md px-2 text-[10px] font-medium transition xl:inline-flex ${
          membersOpen
            ? "bg-white/[.07] text-zinc-200"
            : "text-ink-mute hover:bg-white/[.05] hover:text-zinc-200"
        }`}
        aria-label={membersOpen ? "Hide member list" : "Show member list"}
      >
        <UsersRound size={13} />
        <span>{onlineCount} online</span>
        {membersOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
      </button>
      <span
        className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[10px] font-bold ${
          live
            ? "border-emerald-400/15 bg-emerald-400/[.065] text-emerald-300"
            : "border-white/[.08] bg-white/[.035] text-ink-mute"
        }`}
      >
        {live ? <Wifi size={11} /> : <WifiOff size={11} />}
        <span className="hidden sm:inline">{live ? "Live" : connection}</span>
      </span>
    </header>
  );
}
