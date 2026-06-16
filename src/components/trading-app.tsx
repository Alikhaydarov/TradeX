"use client";

import type { User } from "@supabase/supabase-js";
import { LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Account } from "./account";
import { AdminPanel } from "./admin-panel";
import { AuthModal } from "./auth-modal";
import { AuthProvider, useAuth } from "./auth-context";
import { Backtest } from "./backtest";
import { ChatV4 } from "./chat-v4";
import { FeedV3 } from "./feed-v3";
import { Journal } from "./journal";
import { NotificationListener } from "./notification-listener";
import { RightPanel } from "./right-panel";
import { Sidebar } from "./sidebar";
import { apiRequest } from "@/lib/api-client";
import type { Section } from "./types";

function sectionFromPath(pathname: string): Section {
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/journal")) return "journal";
  if (pathname.startsWith("/backtest")) return "backtest";
  if (pathname.startsWith("/profile") || pathname.startsWith("/account")) return "account";
  if (pathname.startsWith("/admin")) return "admin";
  return "feed";
}

function pathFromSection(section: Section) {
  if (section === "chat") return "/chat";
  if (section === "journal") return "/journal";
  if (section === "backtest") return "/backtest";
  if (section === "account") return "/profile";
  if (section === "admin") return "/admin";
  return "/";
}

function AuthGate({ onLogin }: { onLogin: () => void }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center overflow-x-hidden bg-[#03060e] px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-white sm:px-6">
      <section className="w-full max-w-[460px] rounded-[28px] border border-white/10 bg-[#0b1220]/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-2xl sm:p-7">
        <div className="grid size-16 place-items-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-xl font-black text-blue-100 shadow-xl shadow-blue-950/30">TX</div>
        <p className="mt-6 text-[11px] font-black uppercase text-blue-300/80">Private trading workspace</p>
        <h1 className="mt-2 text-4xl font-black leading-none tracking-tight">TradeX</h1>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          Sign in to manage your feed, chats, prop accounts, journal and backtesting workspace.
        </p>
        <button onClick={onLogin} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950 transition hover:bg-slate-200 active:scale-[.99]">
          <LockKeyhole size={17} /> Login / Register
        </button>
      </section>
    </main>
  );
}

function TradingAppShell() {
  const router = useRouter();
  const pathname = usePathname();
  const section = sectionFromPath(pathname || "/");
  const [authOpen, setAuthOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  const openLogin = () => setAuthOpen(true);
  const chatOpen = section === "chat";

  useEffect(() => {
    if (!user) {
      const timer = window.setTimeout(() => setIsAdmin(false), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    apiRequest<{ isAdmin: boolean }>("/api/admin/me")
      .then((response) => { if (active) setIsAdmin(response.isAdmin); })
      .catch(() => { if (active) setIsAdmin(false); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (section === "admin" && user && !isAdmin) router.replace("/");
  }, [section, user, isAdmin, router]);

  const changeSection = (nextSection: Section) => {
    if (nextSection === "admin" && !isAdmin) return;
    router.push(pathFromSection(nextSection));
  };

  const openProfile = (username: string) => {
    const cleanUsername = username.replace(/^@/, "").toLowerCase();
    router.push(`/${cleanUsername}`);
  };

  const render = () => {
    if (section === "chat") return <ChatV4 onLogin={openLogin} onBack={() => changeSection("feed")} />;
    if (section === "journal") return <Journal onLogin={openLogin} />;
    if (section === "backtest") return <Backtest />;
    if (section === "account") return <Account onLogin={openLogin} />;
    if (section === "admin" && isAdmin) return <AdminPanel onLogin={openLogin} />;
    return <FeedV3 onLogin={openLogin} />;
  };

  if (!user) return <><AuthGate onLogin={openLogin} /><AuthModal open={authOpen} onClose={() => setAuthOpen(false)} /></>;

  return (
    <>
      <div className={`mx-auto flex min-h-[100dvh] max-w-[1500px] gap-4 p-0 text-[#edf3ff] lg:p-4 ${chatOpen ? "xl:max-w-[1600px]" : ""}`}>
        <Sidebar
          active={section}
          onChange={changeSection}
          onPost={() => changeSection("feed")}
          onLogin={openLogin}
          onOpenProfile={openProfile}
          user={user}
          hideMobile={chatOpen}
          isAdmin={isAdmin}
        />
        <main className={chatOpen ? "fixed inset-0 z-50 min-w-0 flex-1 overflow-hidden bg-[#101827] shadow-2xl shadow-slate-950/20 backdrop-blur-2xl lg:static lg:z-auto lg:min-h-[calc(100dvh-2rem)] lg:rounded-[28px] lg:border lg:border-white/9" : "min-h-[100dvh] min-w-0 flex-1 overflow-hidden bg-[#0d1627]/38 pb-20 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl lg:min-h-[calc(100dvh-2rem)] lg:rounded-[28px] lg:border lg:border-white/9 lg:pb-0"}>
          {render()}
        </main>
        {section !== "chat" && <RightPanel />}
      </div>
      <NotificationListener />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

export function TradingApp({ initialUser = null, initialConfigured = false }: { initialUser?: User | null; initialConfigured?: boolean }) {
  return <AuthProvider initialUser={initialUser} initialConfigured={initialConfigured}><TradingAppShell /></AuthProvider>;
}
