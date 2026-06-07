"use client";

import { LockKeyhole, ShieldCheck, TrendingUp, Users } from "lucide-react";
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
import { SkeletonBlock } from "./app-loader";
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

function SessionSkeleton() {
  return (
    <main className="min-h-[100dvh] bg-[linear-gradient(135deg,#050914,#0b1220_45%,#111827)] p-3 text-white lg:p-4">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-[1500px] gap-4">
        <aside className="hidden h-[calc(100dvh-2rem)] w-[238px] shrink-0 rounded-[28px] border border-white/9 bg-white/[.035] p-4 backdrop-blur-2xl lg:block">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-11 w-11 rounded-[15px]" />
            <div className="flex-1 space-y-2"><SkeletonBlock className="h-4 w-24" /><SkeletonBlock className="h-3 w-32" /></div>
          </div>
          <div className="mt-8 space-y-3">{Array.from({ length: 5 }).map((_, index) => <SkeletonBlock key={index} className="h-12 w-full" />)}</div>
        </aside>
        <section className="min-h-[100dvh] flex-1 rounded-[28px] border border-white/9 bg-white/[.03] p-4 backdrop-blur-2xl lg:min-h-[calc(100dvh-2rem)]">
          <SkeletonBlock className="h-12 w-52" />
          <SkeletonBlock className="mt-5 h-36 w-full rounded-[28px]" />
          <div className="mt-5 space-y-3">{Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-28 w-full rounded-[24px]" />)}</div>
        </section>
      </div>
    </main>
  );
}

function AuthGate({ onLogin }: { onLogin: () => void }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center overflow-x-hidden bg-[radial-gradient(circle_at_15%_15%,rgba(14,165,233,.18),transparent_28%),radial-gradient(circle_at_88%_0%,rgba(139,92,246,.16),transparent_30%),linear-gradient(135deg,#050914,#0b1220_45%,#111827)] px-3 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-white sm:px-6 sm:py-10">
      <section className="w-full max-w-[520px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[.045] shadow-2xl shadow-slate-950/40 backdrop-blur-2xl sm:rounded-[36px]">
        <div className="h-24 bg-[radial-gradient(circle_at_20%_30%,rgba(34,211,238,.35),transparent_26%),radial-gradient(circle_at_85%_10%,rgba(139,92,246,.28),transparent_28%),linear-gradient(135deg,#0f172a,#111827_48%,#082f49)] sm:h-28" />
        <div className="px-4 pb-5 sm:px-6 sm:pb-6">
          <div className="-mt-9 grid h-18 w-18 place-items-center rounded-[22px] border-4 border-[#0b1220] bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 text-xl font-black shadow-xl shadow-blue-950/40 sm:-mt-10 sm:h-20 sm:w-20 sm:rounded-[26px] sm:text-2xl">
            TU
          </div>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[.22em] text-cyan-200/70 sm:mt-5 sm:text-[11px] sm:tracking-[.25em]">Private workspace</p>
          <h1 className="mt-2 text-[34px] font-black leading-none tracking-tight sm:text-4xl">TradeUp</h1>
          <p className="mt-3 text-[13px] leading-6 text-slate-400 sm:text-sm">This platform is private. Sign in or register with Google to open posts, chats, journal and trading tools.</p>
          <button onClick={onLogin} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950 transition hover:bg-slate-200 active:scale-[.99] sm:mt-6"><LockKeyhole size={17} /> Login / Register</button>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:mt-5 sm:grid-cols-3 sm:gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/10 p-3 sm:block"><ShieldCheck className="shrink-0 text-emerald-300" size={18} /><p className="text-xs font-bold sm:mt-2">Secure auth</p></div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/10 p-3 sm:block"><Users className="shrink-0 text-cyan-300" size={18} /><p className="text-xs font-bold sm:mt-2">Private chats</p></div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/10 p-3 sm:block"><TrendingUp className="shrink-0 text-violet-300" size={18} /><p className="text-xs font-bold sm:mt-2">Trading feed</p></div>
          </div>
        </div>
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
  const { user, loading } = useAuth();
  const openLogin = () => setAuthOpen(true);
  const chatOpen = section === "chat";

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
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

  const render = () => {
    if (section === "chat") return <ChatV4 onLogin={openLogin} onBack={() => changeSection("feed")} />;
    if (section === "journal") return <Journal onLogin={openLogin} />;
    if (section === "backtest") return <Backtest />;
    if (section === "account") return <Account onLogin={openLogin} />;
    if (section === "admin" && isAdmin) return <AdminPanel onLogin={openLogin} />;
    return <FeedV3 onLogin={openLogin} />;
  };

  if (loading) return <SessionSkeleton />;
  if (!user) return <><AuthGate onLogin={openLogin} /><AuthModal open={authOpen} onClose={() => setAuthOpen(false)} /></>;

  return (
    <>
      <div className={`mx-auto flex min-h-[100dvh] max-w-[1500px] gap-4 p-0 text-[#edf3ff] lg:p-4 ${chatOpen ? "xl:max-w-[1600px]" : ""}`}>
        <Sidebar active={section} onChange={changeSection} onPost={() => changeSection("feed")} onLogin={openLogin} user={user} hideMobile={chatOpen} isAdmin={isAdmin} />
        <main className={chatOpen ? "fixed inset-0 z-50 min-w-0 flex-1 overflow-hidden bg-[#101827] shadow-2xl shadow-slate-950/20 backdrop-blur-2xl lg:static lg:z-auto lg:min-h-[calc(100dvh-2rem)] lg:rounded-[28px] lg:border lg:border-white/9" : "min-h-[100dvh] min-w-0 flex-1 overflow-hidden bg-[#0d1627]/38 pb-20 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl lg:min-h-[calc(100dvh-2rem)] lg:rounded-[28px] lg:border lg:border-white/9 lg:pb-0"}>{render()}</main>
        {section !== "chat" && <RightPanel />}
      </div>
      <NotificationListener />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

export function TradingApp() {
  return <AuthProvider><TradingAppShell /></AuthProvider>;
}
