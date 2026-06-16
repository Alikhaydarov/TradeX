"use client";

import { LockKeyhole } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AuthModal } from "./auth-modal";
import { NotificationListener } from "./notification-listener";
import { RightPanel } from "./right-panel";
import { Sidebar } from "./sidebar";
import { useAuth } from "./auth-context";
import { apiRequest } from "@/lib/api-client";
import type { Section } from "./types";

const FeedV3 = dynamic(() => import("./feed-v3").then((mod) => mod.FeedV3), { ssr: false, loading: () => null });
const ChatV4 = dynamic(() => import("./chat-v4").then((mod) => mod.ChatV4), { ssr: false, loading: () => null });
const Journal = dynamic(() => import("./journal").then((mod) => mod.Journal), { ssr: false, loading: () => null });
const Backtest = dynamic(() => import("./backtest").then((mod) => mod.Backtest), { ssr: false, loading: () => null });
const Account = dynamic(() => import("./account").then((mod) => mod.Account), { ssr: false, loading: () => null });
const AdminPanel = dynamic(() => import("./admin-panel").then((mod) => mod.AdminPanel), { ssr: false, loading: () => null });

const reservedPaths = new Set(["", "chat", "journal", "backtest", "profile", "account", "admin"]);

function usernameFromPath(pathname: string) {
  const first = pathname.replace(/^\//, "").split("/")[0] ?? "";
  if (reservedPaths.has(first)) return "";
  return first.toLowerCase();
}

function sectionFromPath(pathname: string): Section {
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/journal")) return "journal";
  if (pathname.startsWith("/backtest")) return "backtest";
  if (pathname.startsWith("/profile") || pathname.startsWith("/account") || usernameFromPath(pathname)) return "account";
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

function getCurrentSection() {
  if (typeof window === "undefined") return "feed" as Section;
  return sectionFromPath(window.location.pathname);
}

function getCurrentProfileUsername() {
  if (typeof window === "undefined") return "";
  return usernameFromPath(window.location.pathname);
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

export function AppShell() {
  const [section, setSection] = useState<Section>(getCurrentSection);
  const [profileUsername, setProfileUsername] = useState(getCurrentProfileUsername);
  const [authOpen, setAuthOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notificationsMounted, setNotificationsMounted] = useState(false);
  const { user } = useAuth();
  const openLogin = () => setAuthOpen(true);
  const chatOpen = section === "chat";

  useEffect(() => {
    const syncFromPath = () => {
      setSection(getCurrentSection());
      setProfileUsername(getCurrentProfileUsername());
    };
    window.addEventListener("popstate", syncFromPath);
    window.addEventListener("tradeup:open-profile", syncFromPath);
    return () => {
      window.removeEventListener("popstate", syncFromPath);
      window.removeEventListener("tradeup:open-profile", syncFromPath);
    };
  }, []);

  useEffect(() => {
    const preload = () => {
      void import("./feed-v3");
      void import("./chat-v4");
      void import("./journal");
      void import("./backtest");
      void import("./account");
    };
    const timer = window.setTimeout(preload, 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setNotificationsMounted(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user) {
      const timer = window.setTimeout(() => setIsAdmin(false), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    const timer = window.setTimeout(() => {
      void apiRequest<{ isAdmin: boolean }>("/api/admin/me")
        .then((response) => {
          if (active) setIsAdmin(response.isAdmin);
        })
        .catch(() => {
          if (active) setIsAdmin(false);
        });
    }, 1200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [user]);

  useEffect(() => {
    if (section === "admin" && user && !isAdmin) {
      const timer = window.setTimeout(() => {
        window.history.replaceState(null, "", "/");
        setSection("feed");
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [section, user, isAdmin]);

  const changeSection = (nextSection: Section) => {
    if (nextSection === "admin" && !isAdmin) return;
    if (nextSection === section && nextSection !== "account") return;
    setProfileUsername("");
    setSection(nextSection);
    window.history.pushState(null, "", pathFromSection(nextSection));
  };

  const openProfile = (username: string) => {
    const cleanUsername = username.replace(/^@/, "").toLowerCase();
    setProfileUsername(cleanUsername);
    setSection("account");
    window.history.pushState(null, "", `/${cleanUsername}`);
  };

  let activeSection = <FeedV3 onLogin={openLogin} />;
  if (section === "chat") activeSection = <ChatV4 onLogin={openLogin} onBack={() => changeSection("feed")} />;
  else if (section === "journal") activeSection = <Journal onLogin={openLogin} />;
  else if (section === "backtest") activeSection = <Backtest />;
  else if (section === "account") activeSection = <Account onLogin={openLogin} profileUsername={profileUsername || undefined} />;
  else if (section === "admin" && isAdmin) activeSection = <AdminPanel onLogin={openLogin} />;

  if (!user) {
    return (
      <>
        <AuthGate onLogin={openLogin} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div className={`mx-auto flex min-h-[100dvh] max-w-[1500px] gap-4 p-0 text-[#edf3ff] lg:p-4 ${chatOpen ? "xl:max-w-[1600px]" : ""}`}>
        <Sidebar active={section} onChange={changeSection} onPost={() => changeSection("feed")} onLogin={openLogin} onOpenProfile={openProfile} user={user} hideMobile={chatOpen} isAdmin={isAdmin} />
        <main className={chatOpen ? "fixed inset-0 z-50 min-w-0 flex-1 overflow-hidden bg-[#101827] shadow-2xl shadow-slate-950/20 backdrop-blur-2xl lg:static lg:z-auto lg:min-h-[calc(100dvh-2rem)] lg:rounded-[28px] lg:border lg:border-white/9" : "min-h-[100dvh] min-w-0 flex-1 overflow-hidden bg-[#0d1627]/38 pb-20 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl lg:min-h-[calc(100dvh-2rem)] lg:rounded-[28px] lg:border lg:border-white/9 lg:pb-0"}>
          {activeSection}
        </main>
        {!chatOpen && <RightPanel />}
      </div>
      {notificationsMounted && <NotificationListener />}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
