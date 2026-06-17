"use client";

import { BarChart3, BookOpen, LockKeyhole, MessageCircle, ShieldCheck, TrendingUp } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AuthModal } from "./auth-modal";
import { FullScreenLoader } from "./app-loader";
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
  const modules = [
    { label: "Feed", detail: "Trader postlari va signal muhokamalari", icon: TrendingUp },
    { label: "Chat", detail: "Private trader suhbatlari", icon: MessageCircle },
    { label: "Journal", detail: "Prop account va trade review", icon: BookOpen },
    { label: "Backtest", detail: "Strategiya natijasini sinash", icon: BarChart3 },
  ];

  return (
    <main className="grid min-h-[100dvh] place-items-center overflow-x-hidden bg-[#010206] px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-white sm:px-6">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/10 bg-[#05080e]/92 shadow-2xl shadow-slate-950/45 backdrop-blur-2xl lg:grid-cols-[1.05fr_.95fr]">
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-3">
            <div className="grid size-14 place-items-center rounded-2xl border border-blue-400/20 bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 text-lg font-black text-white shadow-xl shadow-blue-950/35">TX</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.22em] text-blue-300/80">Private workspace</p>
              <h1 className="mt-1 text-3xl font-black leading-none tracking-tight sm:text-4xl">TradeX</h1>
            </div>
          </div>

          <p className="mt-6 max-w-xl text-[15px] leading-7 text-slate-300">
            Feed, private chat, journal va backtest bir joyda. Accountga kiring va trading workspace’ingizni davom ettiring.
          </p>

          <button onClick={onLogin} className="mt-7 flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950 transition hover:bg-slate-200 active:scale-[.99]">
            <LockKeyhole size={17} /> Login / Register
          </button>

          <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-bold text-slate-400">
            <span className="rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1.5 text-emerald-300">OAuth secure</span>
            <span className="rounded-full border border-blue-300/15 bg-blue-400/10 px-3 py-1.5 text-blue-200">Cloud sync</span>
            <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5">Responsive app</span>
          </div>
        </div>

        <div className="border-t border-white/8 bg-white/[.025] p-4 sm:p-6 lg:border-l lg:border-t-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {modules.map(({ label, detail, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/15 p-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200">
                  <Icon size={17} />
                </span>
                <span className="min-w-0">
                  <strong className="block text-sm">{label}</strong>
                  <small className="block truncate text-xs text-slate-500">{detail}</small>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-amber-300/12 bg-amber-300/[.055] p-4">
            <div className="flex items-center gap-2 text-amber-200">
              <ShieldCheck size={17} />
              <strong className="text-sm">Trading plan first</strong>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">Risk, setup va review yozuvlari bir flow ichida saqlanadi.</p>
          </div>
        </div>
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
  const [profileOpening, setProfileOpening] = useState(false);
  const [visitedSections, setVisitedSections] = useState<Section[]>(() => [getCurrentSection()]);
  const { user } = useAuth();
  const openLogin = () => setAuthOpen(true);
  const chatOpen = section === "chat";

  useEffect(() => {
    const syncFromPath = () => {
      const nextSection = getCurrentSection();
      setSection(nextSection);
      setVisitedSections((current) => current.includes(nextSection) ? current : [...current, nextSection]);
      setProfileUsername(getCurrentProfileUsername());
    };
    const handleOpenProfile = () => {
      setProfileOpening(true);
      syncFromPath();
    };
    const handleProfileReady = () => {
      window.setTimeout(() => setProfileOpening(false), 40);
    };
    window.addEventListener("popstate", syncFromPath);
    window.addEventListener("tradeup:open-profile", handleOpenProfile);
    window.addEventListener("tradeup:profile-ready", handleProfileReady);
    return () => {
      window.removeEventListener("popstate", syncFromPath);
      window.removeEventListener("tradeup:open-profile", handleOpenProfile);
      window.removeEventListener("tradeup:profile-ready", handleProfileReady);
    };
  }, []);

  useEffect(() => {
    if (!profileOpening) return;
    const timer = window.setTimeout(() => setProfileOpening(false), 900);
    return () => window.clearTimeout(timer);
  }, [profileOpening]);

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
    setVisitedSections((current) => current.includes(nextSection) ? current : [...current, nextSection]);
    window.history.pushState(null, "", pathFromSection(nextSection));
  };

  const renderSection = (item: Section) => {
    if (item === "chat") return <ChatV4 onLogin={openLogin} onBack={() => changeSection("feed")} />;
    if (item === "journal") return <Journal onLogin={openLogin} />;
    if (item === "backtest") return <Backtest />;
    if (item === "account") return <Account onLogin={openLogin} profileUsername={profileUsername || undefined} />;
    if (item === "admin" && isAdmin) return <AdminPanel onLogin={openLogin} />;
    return <FeedV3 onLogin={openLogin} />;
  };

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
      <div className={`mx-auto flex min-h-[100dvh] max-w-[1500px] gap-3 p-0 text-[#edf3ff] lg:p-3 ${chatOpen ? "xl:max-w-[1600px]" : ""}`}>
        <Sidebar active={section} onChange={changeSection} onPost={() => changeSection("feed")} onLogin={openLogin} user={user} hideMobile={chatOpen} isAdmin={isAdmin} />
        <main className={chatOpen ? "fixed inset-0 z-50 min-w-0 flex-1 overflow-hidden bg-[#05080e] shadow-2xl shadow-black/35 lg:static lg:z-auto lg:min-h-[calc(100dvh-1.5rem)] lg:rounded-[22px] lg:border lg:border-white/8" : "min-h-[100dvh] min-w-0 flex-1 overflow-hidden bg-[#04070d]/92 pb-20 shadow-2xl shadow-black/25 lg:min-h-[calc(100dvh-1.5rem)] lg:rounded-[22px] lg:border lg:border-white/8 lg:pb-0"}>
          {visitedSections.map((item) => {
            if (item === "admin" && !isAdmin) return null;
            return (
              <div key={item} className={item === section ? "block min-h-full" : "hidden"}>
                {renderSection(item)}
              </div>
            );
          })}
        </main>
        {!chatOpen && <RightPanel />}
      </div>
      {profileOpening ? <FullScreenLoader label="Opening" /> : null}
      {notificationsMounted && <NotificationListener />}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
