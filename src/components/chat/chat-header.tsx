"use client";

import { Hash, Menu, MessageCircle, UsersRound, Wifi, WifiOff } from "lucide-react";
import type { ChatRoomKind } from "@/features/community-chat/types";
import { Button } from "@/components/ui/button";

export function ChatHeader({
  roomKind,
  title,
  subtitle,
  onlineCount,
  connection,
  onOpenSidebar,
}: {
  roomKind: ChatRoomKind;
  title: string;
  subtitle: string;
  onlineCount: number;
  connection: "connecting" | "connected" | "offline";
  onOpenSidebar: () => void;
}) {
  const live = connection === "connected";

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/[.08] bg-[#090909] px-3 shadow-[0_1px_0_rgba(255,255,255,.025)] sm:px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onOpenSidebar}
        className="text-zinc-400 hover:bg-white/[.06] hover:text-white lg:hidden"
        aria-label="Open chat sidebar"
      >
        <Menu size={17} />
      </Button>

      <span className="grid size-7 shrink-0 place-items-center text-zinc-500">
        {roomKind === "channel" ? <Hash size={20} strokeWidth={2.4} /> : <MessageCircle size={18} />}
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <h1 className="truncate text-[14px] font-bold tracking-[-0.015em] text-zinc-100">{title}</h1>
        <span className="hidden h-5 w-px bg-white/[.07] sm:block" />
        <p className="hidden min-w-0 truncate text-[10px] text-zinc-500 sm:block">{subtitle}</p>
      </div>

      <div className="hidden items-center gap-1.5 px-1.5 text-[10px] font-medium text-zinc-500 sm:flex">
        <UsersRound size={13} /> {onlineCount} online
      </div>
      <span
        className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[9px] font-bold ${
          live
            ? "border-emerald-400/15 bg-emerald-400/[.065] text-emerald-300"
            : "border-white/[.08] bg-white/[.035] text-zinc-500"
        }`}
      >
        {live ? <Wifi size={11} /> : <WifiOff size={11} />}
        <span className="hidden sm:inline">{live ? "Live" : connection}</span>
      </span>
    </header>
  );
}
