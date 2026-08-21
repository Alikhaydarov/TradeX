"use client";

import { useEffect, useMemo, useState } from "react";

import { useActiveAccountStore } from "./active-account-context";
import { Spinner } from "./ui/spinner";
import { TradoxyMark } from "./tradoxy-mark";

/**
 * How long the splash stays up once the app is interactive.
 *
 * This is the only deliberate delay in the boot path. Hydration on a warm load
 * can finish in well under a frame, and flashing a black overlay for 80ms reads
 * as a glitch rather than a brand moment - so the splash holds briefly, then
 * fades. Tune this one number if it feels long or short; nothing else gates it.
 */
const SETTLE_MS = 380;
const FADE_MS = 220;

/**
 * Covers the gap between first paint and an interactive app.
 *
 * The previous version blocked on `GET /api/profile` and threw the response
 * away - the splash was waiting on a round-trip whose result nothing read, so
 * every refresh paid for it. Then it stopped rendering entirely once the server
 * bootstrap landed, which is why the loader disappeared on refresh.
 *
 * Now it renders during SSR, so it is part of the very first paint instead of
 * appearing a frame later, and it leaves on hydration rather than on the
 * network. When there is no server bootstrap it still waits for the client to
 * finish loading accounts, because in that case there genuinely is nothing to
 * show yet.
 */
export function WorkspaceBootLoader({
  bootstrapped = false,
}: {
  bootstrapped?: boolean;
}) {
  const { loading: accountsLoading } = useActiveAccountStore();
  const [hydrated, setHydrated] = useState(false);
  const [settled, setSettled] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setHydrated(true);
    const timer = window.setTimeout(() => setSettled(true), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // A safety valve: if the un-bootstrapped path never resolves, the splash must
  // still leave rather than trap the user behind it.
  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setForceReady(true), 3500);
    return () => window.clearTimeout(timer);
  }, []);

  const ready =
    forceReady ||
    (hydrated && settled && (bootstrapped || !accountsLoading));

  useEffect(() => {
    if (!ready || !visible) return;
    setFinishing(true);
    const timer = window.setTimeout(() => setVisible(false), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [ready, visible]);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  const progress = useMemo(() => {
    if (finishing || forceReady) return 100;
    return Math.min(94, 20 + (hydrated ? 45 : 0) + (settled ? 29 : 0));
  }, [finishing, forceReady, hydrated, settled]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Tradoxy"
      className={`fixed inset-0 z-[2147483647] grid place-items-center bg-black transition-opacity duration-200 ${finishing ? "opacity-0" : "opacity-100"}`}
    >
      <div className="flex -translate-y-4 flex-col items-center gap-5">
        <div className="relative grid size-16 place-items-center">
          <Spinner
            className="absolute inset-0 size-16 text-white/35"
            strokeWidth={1.25}
          />
          <TradoxyMark className="relative size-6 text-white" />
        </div>

        <div className="h-[3px] w-40 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="sr-only">Loading your Tradoxy workspace</span>
      </div>
    </div>
  );
}
