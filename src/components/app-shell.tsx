"use client";

import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AuthModal } from "./auth-modal";
import { NotificationListener } from "./notification-listener";
import { PremiumUpsellDialog } from "./premium-upsell-dialog";
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
    <main className="grid min-h-[100dvh] place-items-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,.06),transparent_24%),radial-gradient(circle_at_bottom,rgba(148,163,184,.08),transparent_24%),linear-gradient(180deg,#111114_0%,#0b0b0d_48%,#09090b_100%)] px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-foreground sm:px-6">
      <section className="auth-card-in auth-border-run relative w-full max-w-[620px] overflow-hidden rounded-[2rem] border border-white/12 bg-[rgba(18,18,22,0.66)] p-5 shadow-[0_28px_90px_rgba(0,0,0,.44),inset_0_1px_0_rgba(255,255,255,.07)] backdrop-blur-[28px] sm:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="pointer-events-none absolute inset-x-10 bottom-0 h-24 bg-[radial-gradient(circle,rgba(217,249,109,.08),transparent_60%)] blur-2xl" />

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

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            ["Secure auth", "Google OAuth"],
            ["Premium ready", "AI + MT5"],
            ["Fast journal", "Proof workflow"],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-white/8 bg-white/[.025] px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{title}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{text}</p>
            </div>
          ))}
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

  if (!user && section === "pricing") {
    return (
      <>
        <Pricing onLogin={openLogin} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

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
      <div className="mx-auto flex min-h-[100dvh] max-w-[1720px] gap-4 bg-transparent p-0 text-foreground lg:p-4">
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
        <div className="hidden w-[256px] shrink-0 lg:block" aria-hidden="true" />
        <main className={chatOpen ? "fixed inset-0 z-50 min-w-0 flex-1 overflow-hidden bg-[rgba(18,18,22,.72)] shadow-2xl shadow-black/35 backdrop-blur-[28px] lg:static lg:z-auto lg:min-h-[calc(100dvh-2rem)] lg:rounded-[1.75rem] lg:border lg:border-white/12" : "min-h-[100dvh] min-w-0 flex-1 overflow-x-hidden bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.03))] pb-[calc(5.5rem+env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(0,0,0,.2),inset_0_1px_0_rgba(255,255,255,.045)] backdrop-blur-xl lg:min-h-[calc(100dvh-2rem)] lg:rounded-[1.75rem] lg:border lg:border-white/10 lg:pb-0"}>
          <div className="block min-h-full">{renderSection(section)}</div>
        </main>
        {!chatOpen && <RightPanel />}
      </div>
      {profileOpening ? <div className="pointer-events-none fixed left-0 right-0 top-0 z-[2147483646] h-0.5 overflow-hidden bg-white/5"><div className="h-full w-1/3 animate-[profileProgress_.8s_ease-in-out_infinite] bg-white" /></div> : null}
      {notificationsMounted && <NotificationListener />}
      <PremiumUpsellDialog />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
