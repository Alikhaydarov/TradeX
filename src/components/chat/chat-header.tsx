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
    <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/[.07] bg-[#050505]/95 px-3.5 backdrop-blur sm:px-4">
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
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/8 bg-[#0a0a0a] text-zinc-400">
        {roomKind === "channel" ? <Hash size={16} /> : <MessageCircle size={16} />}
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[14px] font-bold tracking-[-0.02em] text-white">{title}</h1>
        <p className="mt-0.5 truncate text-[9px] text-zinc-600">{subtitle}</p>
      </div>
      <div className="hidden items-center gap-1.5 rounded-lg border border-white/7 bg-[#090909] px-2 py-1.5 text-[9px] text-zinc-500 sm:flex">
        <UsersRound size={12} /> {onlineCount} online
      </div>
      <span
        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[8px] font-bold ${
          connection === "connected"
            ? "border-emerald-400/12 bg-emerald-400/[.06] text-emerald-400"
            : "border-amber-400/12 bg-amber-400/[.06] text-amber-400"
        }`}
      >
        {connection === "connected" ? <Wifi size={10} /> : <WifiOff size={10} />}
        <span className="hidden sm:inline">{connection === "connected" ? "Live" : connection}</span>
      </span>
    </header>
  );
}
