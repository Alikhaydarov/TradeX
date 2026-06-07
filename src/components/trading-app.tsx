"use client";

import { useEffect, useState, useTransition } from "react";
import { Account } from "./account";
import { AdminPanel } from "./admin-panel";
import { AppLoader } from "./app-loader";
import { AuthModal } from "./auth-modal";
import { AuthProvider, useAuth } from "./auth-context";
import { Backtest } from "./backtest";
import { ChatV2 } from "./chat-v2";
import { FeedV2 } from "./feed-v2";
import { Journal } from "./journal";
import { RightPanel } from "./right-panel";
import { Sidebar } from "./sidebar";
import { apiRequest } from "@/lib/api-client";
import type { Section } from "./types";

function TradingAppShell() {
  const [section, setSection] = useState<Section>("feed");
  const [authOpen, setAuthOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const openLogin = () => setAuthOpen(true);
  const chatOpen = section === "chat";

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    let active = true;
    apiRequest<{ isAdmin: boolean }>("/api/admin/me")
      .then((response) => {
        if (active) setIsAdmin(response.isAdmin);
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const changeSection = (nextSection: Section) => {
    if (nextSection === "admin" && !isAdmin) return;
    startTransition(() => setSection(nextSection));
  };

  const render = () => {
    if (section === "chat") return <ChatV2 onLogin={openLogin} onBack={() => changeSection("feed")} />;
    if (section === "journal") return <Journal onLogin={openLogin} />;
    if (section === "backtest") return <Backtest />;
    if (section === "account") return <Account onLogin={openLogin} />;
    if (section === "admin") return <AdminPanel onLogin={openLogin} />;
    return <FeedV2 onLogin={openLogin} />;
  };

  return (
    <>
      <div className={`mx-auto flex min-h-screen max-w-[1500px] gap-4 p-0 text-[#edf3ff] lg:p-4 ${chatOpen ? "xl:max-w-[1600px]" : ""}`}>
        <Sidebar active={section} onChange={changeSection} onPost={() => changeSection("feed")} onLogin={openLogin} user={user} hideMobile={chatOpen} isAdmin={isAdmin} />
        <main className={
          chatOpen
            ? "fixed inset-0 z-50 min-w-0 flex-1 overflow-hidden bg-[#101827] shadow-2xl shadow-slate-950/20 backdrop-blur-2xl lg:static lg:z-auto lg:min-h-[calc(100vh-2rem)] lg:rounded-[28px] lg:border lg:border-white/9"
            : "min-h-screen min-w-0 flex-1 overflow-hidden bg-[#0d1627]/38 pb-20 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl lg:min-h-[calc(100vh-2rem)] lg:rounded-[28px] lg:border lg:border-white/9 lg:pb-0"
        }>
          {isPending ? <AppLoader /> : render()}
        </main>
        {section !== "chat" && <RightPanel />}
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

export function TradingApp() {
  return (
    <AuthProvider>
      <TradingAppShell />
    </AuthProvider>
  );
}
