"use client";

import { LockKeyhole, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Account } from "./account";
import { AdminPanel } from "./admin-panel";
import { AppLoader } from "./app-loader";
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

function AuthGate({ onLogin }: { onLogin: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,.16),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,.14),transparent_28%),linear-gradient(135deg,#050914,#0b1220_45%,#111827)] px-4 py-10 text-white">
      <section className="w-full max-w-lg overflow-hidden rounded-[36px] border border-white/10 bg-white/[.045] shadow-2xl shadow-slate-950/40 backdrop-blur-2xl">
        <div className="h-28 bg-[radial-gradient(circle_at_20%_30%,rgba(34,211,238,.35),transparent_26%),radial-gradient(circle_at_85%_10%,rgba(139,92,246,.28),transparent_28%),linear-gradient(135deg,#0f172a,#111827_48%,#082f49)]" />
        <div className="px-6 pb-6">
          <div className="-mt-10 grid h-20 w-20 place-items-center rounded-[26px] border-4 border-[#0b1220] bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 text-2xl font-black shadow-xl shadow-blue-950/40">
            TU
          </div>

          <p className="mt-5 text-[11px] font-black uppercase tracking-[.25em] text-cyan-200/70">Private workspace</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">TradeUp</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            This platform is private. Sign in or register with Google to open posts, chats, journal and trading tools.
          </p>

          <button onClick={onLogin} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200">
            <LockKeyhole size={17} /> Login / Register
          </button>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
              <ShieldCheck className="text-emerald-300" size={18} />
              <p className="mt-2 text-xs font-bold">Secure auth</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
              <Users className="text-cyan-300" size={18} />
              <p className="mt-2 text-xs font-bold">Private chats</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
              <TrendingUp className="text-violet-300" size={18} />
              <p className="mt-2 text-xs font-bold">Trading feed</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function TradingAppShell() {
  const [section, setSection] = useState<Section>("feed");
  const [authOpen, setAuthOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { user, loading } = useAuth();
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
    if (section === "chat") return <ChatV4 onLogin={openLogin} onBack={() => changeSection("feed")} />;
    if (section === "journal") return <Journal onLogin={openLogin} />;
    if (section === "backtest") return <Backtest />;
    if (section === "account") return <Account onLogin={openLogin} />;
    if (section === "admin") return <AdminPanel onLogin={openLogin} />;
    return <FeedV3 onLogin={openLogin} />;
  };

  if (loading) {
    return <AppLoader label="Checking session" />;
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
      <NotificationListener />
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
