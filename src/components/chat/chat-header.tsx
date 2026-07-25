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
  return (
    <header className="flex h-13 shrink-0 items-center gap-2 border-b border-white/8 bg-[#060606] px-2.5 sm:px-3">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onOpenSidebar}
        className="lg:hidden"
        aria-label="Open chat sidebar"
      >
        <Menu size={16} />
      </Button>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/8 bg-[#0b0b0b] text-zinc-400">
        {roomKind === "channel" ? <Hash size={15} /> : <MessageCircle size={15} />}
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[13px] font-bold text-white">{title}</h1>
        <p className="truncate text-[9px] text-zinc-700">{subtitle}</p>
      </div>
      <div className="hidden items-center gap-1.5 text-[9px] text-zinc-600 sm:flex">
        <UsersRound size={12} /> {onlineCount} online
      </div>
      <span
        className={`ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[8px] font-semibold ${connection === "connected" ? "bg-emerald-400/[.07] text-emerald-400" : "bg-amber-400/[.07] text-amber-400"}`}
      >
        {connection === "connected" ? <Wifi size={10} /> : <WifiOff size={10} />}
        <span className="hidden sm:inline">{connection === "connected" ? "Live" : connection}</span>
      </span>
    </header>
  );
}
