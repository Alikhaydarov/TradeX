"use client";

import { useEffect, useState } from "react";

import { useActiveAccountStore } from "./active-account-context";
import { useAuth } from "./auth-context";
import { TradoxyMark } from "./tradoxy-mark";

const INTRO_MS = 2800;
const REFRESH_MS = 650;
const FADE_MS = 280;
const FORCE_READY_MS = 3500;
const WELCOME_SESSION_KEY = "tradoxy:welcome-shown";

/**
 * A single branded entrance for a fresh app load. The shared workspace layout
 * stays mounted during route changes, so this does not replay between pages.
 * Nothing network-bound can keep the user behind the overlay indefinitely.
 */
export function WorkspaceBootLoader({
  bootstrapped = false,
}: {
  bootstrapped?: boolean;
}) {
  const { loading: accountsLoading } = useActiveAccountStore();
  const { profile, user } = useAuth();
  const [mode, setMode] = useState<"pending" | "welcome" | "refresh">(
    "pending",
  );
  const [entered, setEntered] = useState(false);
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [forceReady, setForceReady] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [visible, setVisible] = useState(true);
  const displayName = String(
    profile?.username ||
      profile?.fullName ||
      user?.user_metadata?.user_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "trader",
  ).replace(/^@/, "");

  useEffect(() => {
    const hasWelcomed = window.sessionStorage.getItem(WELCOME_SESSION_KEY);
    const nextMode = hasWelcomed ? "refresh" : "welcome";
    if (!hasWelcomed) {
      window.sessionStorage.setItem(WELCOME_SESSION_KEY, "1");
    }
    setMode(nextMode);

    const frame = window.requestAnimationFrame(() => setEntered(true));
    const introTimer = window.setTimeout(
      () => setMinimumElapsed(true),
      nextMode === "welcome" ? INTRO_MS : REFRESH_MS,
    );
    const forceTimer = window.setTimeout(
      () => setForceReady(true),
      FORCE_READY_MS,
    );
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(introTimer);
      window.clearTimeout(forceTimer);
    };
  }, []);

  const appReady = bootstrapped || !accountsLoading || forceReady;

  useEffect(() => {
    if (!minimumElapsed || !appReady || !visible) return;
    setFinishing(true);
    const timer = window.setTimeout(() => setVisible(false), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [appReady, minimumElapsed, visible]);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  if (!visible || mode === "pending") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={
        mode === "welcome" ? `Welcome back, ${displayName}` : "Loading Tradoxy"
      }
      className={`fixed inset-0 z-[2147483647] grid place-items-center overflow-hidden bg-black px-6 transition-opacity duration-300 ${finishing ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      {mode === "refresh" ? (
        <div
          className={`flex flex-col items-center transition duration-300 ${entered ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        >
          <span className="grid size-12 place-items-center rounded-lg border border-white/12 bg-white/[.04]">
            <TradoxyMark className="size-5 text-white" />
          </span>
          <span className="mt-5 size-4 animate-spin rounded-full border border-white/20 border-t-white" />
        </div>
      ) : (
        <div
          className={`flex w-full max-w-lg flex-col items-center text-center transition-[opacity,transform] duration-500 ease-out ${entered ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`}
        >
          <div className="tx-welcome-frame flex w-full items-center justify-center gap-4">
            <span className="h-px w-12 bg-white/10 sm:w-20" />
            <span className="tx-welcome-logo grid size-12 shrink-0 place-items-center rounded-lg border border-white/12 bg-white/[.04] shadow-[0_16px_60px_rgba(255,255,255,.06)]">
              <TradoxyMark className="size-5 text-white" />
            </span>
            <span className="h-px w-12 bg-white/10 sm:w-20" />
          </div>

          <p className="tx-welcome-eyebrow mt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Tradoxy workspace
          </p>
          <h1 className="tx-welcome-title mt-2 text-balance text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Welcome back, {displayName}
          </h1>
          <p className="tx-welcome-subtitle mt-3 text-sm text-white/48">
            Your trading desk is ready.
          </p>

          <div className="mt-8 h-px w-44 overflow-hidden bg-white/10">
            <span className="tx-welcome-progress block h-full bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
