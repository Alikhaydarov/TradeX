"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { useActiveAccountStore } from "./active-account-context";
import { Spinner } from "./ui/spinner";

export function WorkspaceBootLoader() {
  const { loading: accountsLoading } = useActiveAccountStore();
  const [profileReady, setProfileReady] = useState(false);
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [forceReady, setForceReady] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let active = true;
    const minimumTimer = window.setTimeout(() => {
      if (active) setMinimumElapsed(true);
    }, 650);
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
      window.clearTimeout(minimumTimer);
      window.clearTimeout(maximumTimer);
    };
  }, []);

  const ready = forceReady || (!accountsLoading && profileReady && minimumElapsed);

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
      18 +
        (accountsLoading ? 0 : 40) +
        (profileReady ? 28 : 0) +
        (minimumElapsed ? 12 : 0),
    );
  }, [accountsLoading, finishing, forceReady, minimumElapsed, profileReady]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Tradox"
      className={`fixed inset-0 z-[2147483647] grid place-items-center bg-black transition-opacity duration-200 ${finishing ? "opacity-0" : "opacity-100"}`}
    >
      <div className="flex -translate-y-4 flex-col items-center gap-5">
        <div className="relative grid size-16 place-items-center">
          <Spinner
            className="absolute inset-0 size-16 text-white/35"
            strokeWidth={1.25}
          />
          <div className="relative size-9 overflow-hidden rounded-lg border border-white/15 bg-[#171717] shadow-[0_10px_35px_rgba(255,255,255,.08)]">
            <Image
              src="/tradox-logo.webp"
              alt="Tradox"
              fill
              sizes="36px"
              priority
              className="object-cover"
            />
          </div>
        </div>

        <div className="h-[3px] w-40 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="sr-only">Loading your Tradox workspace</span>
      </div>
    </div>
  );
}
