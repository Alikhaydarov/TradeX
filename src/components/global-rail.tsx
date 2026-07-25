"use client";

import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import {
  CalendarDays,
  CreditCard,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Settings2,
  SquareChartGantt,
  TrendingUp,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "./auth-context";
import { Dialog, DialogContent } from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { TraderAvatar } from "./trader-avatar";
import type { Section } from "./types";
import { useWorkspacePreferences } from "./workspace-preferences-context";

const NAV: Array<{ id: Section; label: string; icon: typeof Home }> = [
  { id: "feed", label: "Home", icon: Home },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "trades", label: "Trades", icon: SquareChartGantt },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
  { id: "community", label: "Community", icon: UsersRound },
];

const MOBILE_NAV = NAV.filter((item) =>
  ["feed", "dashboard", "trades", "community"].includes(item.id),
);

function userName(user: User | null) {
  return String(
    user?.user_metadata.full_name ||
      user?.user_metadata.name ||
      user?.email?.split("@")[0] ||
      "Trader",
  );
}

export function GlobalRail({
  active,
  onChange,
  onLogin,
  user,
}: {
  active: Section;
  onChange: (section: Section) => void;
  onLogin: () => void;
  user: User | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const { signOut } = useAuth();
  const { setSettingsOpen } = useWorkspacePreferences();
  const name = profileName || userName(user);
  const avatar =
    profileAvatar ||
    (typeof user?.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null);

  useEffect(() => {
    const open = () => setMobileOpen(true);
    window.addEventListener("tradox:open-mobile-menu", open);
    return () => window.removeEventListener("tradox:open-mobile-menu", open);
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void apiRequest<{
      profile: { full_name?: string | null; avatar_url?: string | null };
    }>("/api/profile")
      .then(({ profile }) => {
        if (!alive) return;
        setProfileName(profile.full_name || "");
        setProfileAvatar(profile.avatar_url || "");
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [user]);

  const navigate = (section: Section) => {
    setMobileOpen(false);
    onChange(section);
  };

  const openProfile = () => {
    if (!user) {
      onLogin();
      return;
    }
    navigate("account");
  };

  const logout = async () => {
    await signOut();
    window.location.assign("/");
  };

  const navButton = (
    item: (typeof NAV)[number],
    mode: "rail" | "drawer" = "rail",
  ) => {
    const Icon = item.icon;
    const selected = active === item.id;
    if (mode === "drawer") {
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => navigate(item.id)}
          className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition ${
            selected
              ? "bg-white/[.09] text-white ring-1 ring-white/10"
              : "text-zinc-500 hover:bg-white/[.045] hover:text-zinc-200"
          }`}
        >
          <Icon size={17} />
          <span className="text-[13px] font-semibold">{item.label}</span>
        </button>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onChange(item.id)}
        className={`group relative grid size-11 place-items-center rounded-xl transition ${
          selected
            ? "bg-white/[.1] text-white ring-1 ring-white/12"
            : "text-zinc-600 hover:bg-white/[.05] hover:text-zinc-200"
        }`}
        aria-label={item.label}
        title={item.label}
      >
        {selected ? (
          <span className="absolute -left-[15px] h-6 w-1 rounded-r-full bg-white" />
        ) : null}
        <Icon size={18} strokeWidth={selected ? 2.35 : 2} />
      </button>
    );
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-[85] hidden w-[72px] flex-col items-center border-r border-white/8 bg-[#020202] py-3 md:flex">
        <button
          type="button"
          onClick={() => onChange("feed")}
          className="relative grid size-11 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#111] shadow-[0_10px_28px_rgba(0,0,0,.4)]"
          aria-label="Tradox home"
          title="Tradox"
        >
          <Image
            src="/tradox-logo.webp"
            alt="Tradox"
            width={44}
            height={44}
            className="h-full w-full object-cover"
            priority
          />
        </button>

        <div className="my-3 h-px w-8 bg-white/8" />
        <nav className="flex flex-1 flex-col items-center gap-1.5" aria-label="Global navigation">
          {NAV.map((item) => navButton(item))}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`grid size-11 place-items-center rounded-xl border transition ${
                active === "account"
                  ? "border-white/20 bg-white/[.08]"
                  : "border-white/8 bg-[#080808] hover:border-white/16"
              }`}
              aria-label="Account menu"
              title={name}
            >
              <TraderAvatar name={name} value={avatar} className="size-8 rounded-lg text-[10px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" sideOffset={12} className="w-52 border-white/10 bg-[#080808] p-1.5">
            <DropdownMenuItem onClick={openProfile} className="rounded-lg px-3 py-2.5">
              <UserRound size={14} className="mr-2" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="rounded-lg px-3 py-2.5">
              <Settings2 size={14} className="mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChange("pricing")} className="rounded-lg px-3 py-2.5">
              <CreditCard size={14} className="mr-2" /> Plans
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void logout()} className="rounded-lg px-3 py-2.5 text-rose-300 focus:text-rose-200">
              <LogOut size={14} className="mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </aside>

      <nav className="fixed inset-x-2 bottom-[max(.5rem,env(safe-area-inset-bottom))] z-[95] grid h-14 grid-cols-5 rounded-2xl border border-white/10 bg-black/95 p-1 shadow-[0_16px_50px_rgba(0,0,0,.65)] backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl text-[8px] font-semibold transition ${selected ? "bg-white/[.09] text-white" : "text-zinc-600"}`}
            >
              <Icon size={16} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 rounded-xl text-[8px] font-semibold text-zinc-600"
        >
          <MoreHorizontal size={17} />
          More
        </button>
      </nav>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent
          showCloseButton={false}
          className="left-0 top-0 h-[100dvh] w-[82vw] max-w-[320px] translate-x-0 translate-y-0 rounded-none border-r border-white/10 bg-[#030303] p-0 md:hidden"
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/8 p-4">
              <div className="flex items-center gap-3">
                <span className="relative grid size-10 overflow-hidden rounded-xl border border-white/10 bg-[#111]">
                  <Image src="/tradox-logo.webp" alt="Tradox" width={40} height={40} className="h-full w-full object-cover" />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Tradox</p>
                  <p className="text-[10px] text-zinc-600">Trading workspace</p>
                </div>
              </div>
              <button type="button" onClick={() => setMobileOpen(false)} className="grid size-9 place-items-center rounded-xl border border-white/10 bg-[#090909] text-zinc-400">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto p-3">
              {NAV.map((item) => navButton(item, "drawer"))}
            </div>

            <div className="border-t border-white/8 p-3">
              <button type="button" onClick={openProfile} className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-[#080808] p-2.5 text-left">
                <TraderAvatar name={name} value={avatar} className="size-9 rounded-lg text-[10px]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">{name}</p>
                  <p className="truncate text-[9px] text-zinc-600">Open profile</p>
                </div>
                <Menu size={14} className="text-zinc-700" />
              </button>
              <div className="mt-2 grid grid-cols-3 gap-1">
                <button type="button" onClick={() => { setMobileOpen(false); setSettingsOpen(true); }} className="grid h-9 place-items-center rounded-lg bg-white/[.04] text-zinc-500"><Settings2 size={14} /></button>
                <button type="button" onClick={() => navigate("pricing")} className="grid h-9 place-items-center rounded-lg bg-white/[.04] text-zinc-500"><CreditCard size={14} /></button>
                <button type="button" onClick={() => void logout()} className="grid h-9 place-items-center rounded-lg bg-rose-400/[.06] text-rose-300"><LogOut size={14} /></button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
