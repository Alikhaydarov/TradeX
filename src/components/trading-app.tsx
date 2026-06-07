"use client";

import { useState } from "react";
import { Account } from "./account";
import { AuthModal } from "./auth-modal";
import { AuthProvider, useAuth } from "./auth-context";
import { Backtest } from "./backtest";
import { Chat } from "./chat";
import { Feed } from "./feed";
import { Journal } from "./journal";
import { RightPanel } from "./right-panel";
import { Sidebar } from "./sidebar";
import type { Section } from "./types";

function TradingAppShell() {
  const [section, setSection] = useState<Section>("feed");
  const [authOpen, setAuthOpen] = useState(false);
  const { user } = useAuth();
  const openLogin = () => setAuthOpen(true);

  const render = () => {
    if (section === "chat") return <Chat onLogin={openLogin} />;
    if (section === "journal") return <Journal onLogin={openLogin} />;
    if (section === "backtest") return <Backtest />;
    if (section === "account") return <Account onLogin={openLogin} />;
    return <Feed onLogin={openLogin} />;
  };

  return (
    <>
      <div className={`mx-auto flex min-h-screen max-w-[1500px] gap-4 p-0 text-[#edf3ff] lg:p-4 ${section === "chat" ? "xl:max-w-[1600px]" : ""}`}>
        <Sidebar active={section} onChange={setSection} onPost={() => setSection("feed")} onLogin={openLogin} user={user} />
        <main className="min-h-screen min-w-0 flex-1 overflow-hidden bg-[#0d1627]/38 pb-20 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl lg:min-h-[calc(100vh-2rem)] lg:rounded-[28px] lg:border lg:border-white/9 lg:pb-0">{render()}</main>
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
