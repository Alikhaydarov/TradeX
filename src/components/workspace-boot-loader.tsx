"use client";

import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { useActiveAccountStore } from "./active-account-context";
import { Spinner } from "./ui/spinner";
import { TradoxyMark } from "./tradoxy-mark";

export function WorkspaceBootLoader() {
  const { loading: accountsLoading } = useActiveAccountStore();
  const [profileReady, setProfileReady] = useState(false);
  const [forceReady, setForceReady] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let active = true;
    // There used to be a 650ms minimum display time here, which meant a warm
    // load that already had its data still sat behind the splash. The loader
    // now disappears the moment the workspace is actually ready.
    const maximumTimer = window.setTimeout(() => {
      if (active) setForceReady(true);
    }, 3500);

    void apiRequest<{ profile?: unknown }>("/api/profile")
      .catch(() => undefined)
      .finally(() => {
        if (active) setProfileReady(true);
      });

    return () => {
      active = false;
      window.clearTimeout(maximumTimer);
    };
  }, []);

  const ready = forceReady || (!accountsLoading && profileReady);

  useEffect(() => {
    if (!ready || !visible) return;
    setFinishing(true);
    const timer = window.setTimeout(() => setVisible(false), 220);
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
    return Math.min(
      92,
      18 + (accountsLoading ? 0 : 45) + (profileReady ? 29 : 0),
    );
  }, [accountsLoading, finishing, forceReady, profileReady]);

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
