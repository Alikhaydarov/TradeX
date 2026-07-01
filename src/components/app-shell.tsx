"use client";

import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
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
const Journal = dynamic(() => import("./journal").then((mod) => mod.Journal), { ssr: false, loading: () => null });
const Account = dynamic(() => import("./account").then((mod) => mod.Account), { ssr: false, loading: () => null });
const AdminPanel = dynamic(() => import("./admin-panel").then((mod) => mod.AdminPanel), { ssr: false, loading: () => null });
const Pricing = dynamic(() => import("./pricing").then((mod) => mod.Pricing), { ssr: false, loading: () => null });

const reservedPaths = new Set(["", "chat", "journal", "backtest", "profile", "account", "pricing", "admin"]);

function usernameFromPath(pathname: string) {
  const first = pathname.replace(/^\//, "").split("/")[0] ?? "";
  if (reservedPaths.has(first)) return "";
  return first.toLowerCase();
}

function sectionFromPath(pathname: string): Section {
  if (pathname.startsWith("/journal")) return "journal";
  if (pathname.startsWith("/pricing")) return "pricing";
  if (pathname.startsWith("/profile") || pathname.startsWith("/account") || usernameFromPath(pathname)) return "account";
  if (pathname.startsWith("/admin")) return "admin";
  return "feed";
}

function pathFromSection(section: Section) {
  if (section === "journal") return "/journal";
  if (section === "account") return "/profile";
  if (section === "pricing") return "/pricing";
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
    <main className="grid min-h-[100dvh] place-items-center overflow-hidden bg-background px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-foreground sm:px-6">
      <section className="auth-card-in auth-border-run relative w-full max-w-[500px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[rgba(8,8,8,0.74)] p-5 shadow-[0_24px_80px_rgba(0,0,0,.65),inset_0_1px_0_rgba(255,255,255,.055)] backdrop-blur-2xl sm:p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="auth-logo-pulse grid size-12 place-items-center rounded-2xl border border-white/15 bg-white text-base font-black text-black shadow-[0_14px_34px_rgba(255,255,255,.08)]">TW</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-zinc-500">Private workspace</p>
              <h1 className="mt-1 text-3xl font-black leading-none tracking-tight">TradeWay</h1>
            </div>
          </div>
          <span className="hidden h-9 items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 text-[11px] font-black text-emerald-300 sm:inline-flex">
            <ShieldCheck size={14} /> Secure
          </span>
        </div>

        <p className="mt-6 text-[15px] leading-7 text-zinc-300">
          Sign in to your trading workspace. Journal, account progress, proof profile and trade sharing stay in one fast flow.
        </p>

        <button
          onClick={onLogin}
          className="group mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-zinc-950 shadow-[0_14px_34px_rgba(255,255,255,.08)] transition-colors hover:bg-zinc-200 active:bg-zinc-300"
        >
          <LockKeyhole size={17} />
          Login / Register
          <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
        </button>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-black text-zinc-400">
          <span className="rounded-2xl border border-white/10 bg-white/[.035] px-2 py-2 backdrop-blur-xl">Journal</span>
          <span className="rounded-2xl border border-white/10 bg-white/[.035] px-2 py-2 backdrop-blur-xl">Accounts</span>
          <span className="rounded-2xl border border-white/10 bg-white/[.035] px-2 py-2 backdrop-blur-xl">Proof</span>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-300/12 bg-amber-300/[.055] p-3 text-amber-100 backdrop-blur-xl">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-amber-200" />
          <p className="text-xs leading-5 text-zinc-300">
            <strong className="text-amber-100">Trading plan first.</strong> Risk, setup and review notes stay attached to each trade.
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
  const { user } = useAuth();
  const openLogin = () => setAuthOpen(true);
  const chatOpen = false;

  useEffect(() => {
    const syncFromPath = () => {
      const nextSection = getCurrentSection();
      setSection(nextSection);
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

  const renderSection = (item: Section) => {
    if (item === "journal") return <Journal onLogin={openLogin} />;
    if (item === "account") return <Account onLogin={openLogin} profileUsername={profileUsername || undefined} />;
    if (item === "pricing") return <Pricing />;
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
      <div className="mx-auto flex min-h-[100dvh] max-w-[1560px] gap-3 bg-transparent p-0 text-foreground lg:p-3">
        <Sidebar
          active={section}
          onChange={changeSection}
          onPost={() => {
            changeSection("feed");
            window.setTimeout(() => window.dispatchEvent(new Event("tradeway:share-trade")), 0);
          }}
          onLogin={openLogin}
          user={user}
          hideMobile={chatOpen}
          isAdmin={isAdmin}
        />
        <div className="hidden w-[232px] shrink-0 lg:block" aria-hidden="true" />
        <main className={chatOpen ? "fixed inset-0 z-50 min-w-0 flex-1 overflow-hidden bg-[rgba(8,8,8,.78)] shadow-2xl shadow-black/45 backdrop-blur-2xl lg:static lg:z-auto lg:min-h-[calc(100dvh-1.5rem)] lg:rounded-[1.5rem] lg:border lg:border-white/10" : "min-h-[100dvh] min-w-0 flex-1 overflow-x-hidden bg-[rgba(255,255,255,.018)] pb-[calc(5.5rem+env(safe-area-inset-bottom))] shadow-[0_18px_58px_rgba(0,0,0,.32),inset_0_1px_0_rgba(255,255,255,.025)] backdrop-blur-sm lg:min-h-[calc(100dvh-1.5rem)] lg:rounded-[1.5rem] lg:border lg:border-white/8 lg:pb-0"}>
          <div className="block min-h-full">{renderSection(section)}</div>
        </main>
        {!chatOpen && <RightPanel />}
      </div>
      {profileOpening ? <div className="pointer-events-none fixed left-0 right-0 top-0 z-[2147483646] h-0.5 overflow-hidden bg-white/5"><div className="h-full w-1/3 animate-[profileProgress_.8s_ease-in-out_infinite] bg-white" /></div> : null}
      {notificationsMounted && <NotificationListener />}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
