"use client";

import { useEffect, useRef, useState } from "react";

import { useActiveAccountStore } from "./active-account-context";
import { useAuth } from "./auth-context";
import { TradoxyMark } from "./tradoxy-mark";

const INTRO_MS = 2100;
const FADE_MS = 280;
const FORCE_READY_MS = 3500;

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
  const [entered, setEntered] = useState(false);
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [forceReady, setForceReady] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [visible, setVisible] = useState(true);
  const spoke = useRef(false);

  const displayName = String(
    profile?.username ||
      profile?.fullName ||
      user?.user_metadata?.user_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "trader",
  ).replace(/^@/, "");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setEntered(true));
    const introTimer = window.setTimeout(
      () => setMinimumElapsed(true),
      INTRO_MS,
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

  useEffect(() => {
    if (spoke.current || !entered || !displayName) return;
    spoke.current = true;
    const timer = window.setTimeout(() => {
      if (!("speechSynthesis" in window)) return;
      try {
        const message = new SpeechSynthesisUtterance(
          `Welcome back, ${displayName}`,
        );
        message.lang = "en-US";
        message.rate = 1.05;
        message.pitch = 0.94;
        message.volume = 0.55;
        window.speechSynthesis.speak(message);
      } catch {
        // Autoplay speech is optional and may be blocked by the browser.
      }
    }, 620);
    return () => window.clearTimeout(timer);
  }, [displayName, entered]);

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

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Welcome back, ${displayName}`}
      className={`fixed inset-0 z-[2147483647] grid place-items-center overflow-hidden bg-black px-6 transition-opacity duration-300 ${finishing ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <div
        className={`flex w-full max-w-lg flex-col items-center text-center transition-[opacity,transform] duration-500 ease-out ${entered ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`}
      >
        <span className="tx-welcome-logo grid size-12 place-items-center rounded-lg border border-white/12 bg-white/[.04] shadow-[0_16px_60px_rgba(255,255,255,.06)]">
          <TradoxyMark className="size-5 text-white" />
        </span>

        <p className="tx-welcome-eyebrow mt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
          Tradoxy workspace
        </p>
        <h1 className="tx-welcome-title mt-2 text-balance text-3xl font-semibold leading-tight text-white sm:text-4xl">
          Welcome back, {displayName}
        </h1>
        <p className="tx-welcome-subtitle mt-3 text-sm text-white/48">Your trading desk is ready.</p>

        <div className="mt-8 h-px w-44 overflow-hidden bg-white/10">
          <span className="tx-welcome-progress block h-full bg-white" />
        </div>
      </div>
    </div>
  );
}
