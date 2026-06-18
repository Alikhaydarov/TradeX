"use client";

import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
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
  return (
    <main className="grid min-h-[100dvh] place-items-center overflow-hidden bg-[#0b0b0b] px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-white sm:px-6">
      <section className="auth-card-in auth-border-run relative w-full max-w-[520px] overflow-hidden rounded-[26px] border border-white/10 bg-[#111111]/94 p-5 shadow-2xl shadow-black/55 backdrop-blur-2xl sm:p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="auth-logo-pulse grid size-12 place-items-center rounded-2xl border border-white/15 bg-gradient-to-br from-zinc-200 via-zinc-500 to-zinc-900 text-base font-black text-black shadow-xl shadow-black/35">TW</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-zinc-400">Private workspace</p>
              <h1 className="mt-1 text-3xl font-black leading-none tracking-tight">TradeWay</h1>
            </div>
          </div>
          <span className="hidden h-9 items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 text-[11px] font-black text-emerald-300 sm:inline-flex">
            <ShieldCheck size={14} /> Secure
          </span>
        </div>

        <p className="mt-6 text-[15px] leading-7 text-slate-300">
          Trading workspace'ingizga kiring. Journal, chat, feed va backtest bir joyda, tez va toza flow bilan ishlaydi.
        </p>

        <button
          onClick={onLogin}
          className="group mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950 shadow-lg shadow-white/5 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-200 active:translate-y-0 active:scale-[.99]"
        >
          <LockKeyhole size={17} />
          Login / Register
          <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
        </button>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-black text-slate-400">
          <span className="rounded-2xl border border-white/8 bg-white/[.035] px-2 py-2">Journal</span>
          <span className="rounded-2xl border border-white/8 bg-white/[.035] px-2 py-2">Chat</span>
          <span className="rounded-2xl border border-white/8 bg-white/[.035] px-2 py-2">Backtest</span>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-300/12 bg-amber-300/[.055] p-3 text-amber-100">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-amber-200" />
          <p className="text-xs leading-5 text-slate-400">
            <strong className="text-amber-100">Trading plan first.</strong> Risk, setup va review yozuvlari bir flow ichida saqlanadi.
          </p>
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
      <div className="mx-auto flex min-h-[100dvh] max-w-[1600px] gap-3 bg-background p-0 text-foreground lg:p-3">
        <Sidebar active={section} onChange={changeSection} onPost={() => changeSection("feed")} onLogin={openLogin} user={user} hideMobile={chatOpen} isAdmin={isAdmin} />
        <div className="hidden w-[232px] shrink-0 lg:block" aria-hidden="true" />
        <main className={chatOpen ? "fixed inset-0 z-50 min-w-0 flex-1 overflow-hidden bg-background shadow-2xl shadow-black/35 lg:static lg:z-auto lg:min-h-[calc(100dvh-1.5rem)] lg:rounded-[22px] lg:border lg:border-border" : "min-h-[100dvh] min-w-0 flex-1 overflow-hidden bg-background pb-20 shadow-2xl shadow-black/25 lg:min-h-[calc(100dvh-1.5rem)] lg:rounded-[22px] lg:border lg:border-border lg:pb-0"}>
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
