"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AuthLanding } from "./auth/auth-landing";
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
        <AuthLanding onLogin={openLogin} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div className="mx-auto flex min-h-[100dvh] max-w-[1560px] gap-3 bg-background p-0 text-foreground lg:p-3">
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
        <main className={chatOpen ? "fixed inset-0 z-50 min-w-0 flex-1 overflow-hidden bg-background shadow-2xl shadow-black/35 lg:static lg:z-auto lg:min-h-[calc(100dvh-1.5rem)] lg:rounded-xl lg:border lg:border-border" : "min-h-[100dvh] min-w-0 flex-1 overflow-x-hidden bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/25 lg:min-h-[calc(100dvh-1.5rem)] lg:rounded-xl lg:border lg:border-border lg:pb-0"}>
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
