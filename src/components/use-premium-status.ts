"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "./auth-context";

export interface PremiumStatus {
  plan: "free" | "standard" | "pro";
  isPremium: boolean;
  aiEnabled: boolean;
  traderoxEnabled: boolean;
  autoSyncEnabled: boolean;
  isVerified: boolean;
}

const FREE_STATUS: PremiumStatus = {
  plan: "free",
  isPremium: false,
  aiEnabled: false,
  traderoxEnabled: false,
  autoSyncEnabled: false,
  isVerified: false,
};

const PREMIUM_CACHE_TTL_MS = 60_000;
const premiumCache = new Map<string, { status: PremiumStatus; fetchedAt: number }>();
const premiumRequests = new Map<string, Promise<PremiumStatus>>();

function cachedPremiumStatus(userId?: string) {
  return userId ? premiumCache.get(userId) : undefined;
}

async function requestPremiumStatus(userId: string, force = false) {
  const cached = premiumCache.get(userId);
  if (!force && cached && Date.now() - cached.fetchedAt < PREMIUM_CACHE_TTL_MS) {
    return cached.status;
  }

  const pending = premiumRequests.get(userId);
  if (pending) return pending;

  const request = apiRequest<PremiumStatus>("/api/premium/status", {
    cacheMs: force ? 0 : PREMIUM_CACHE_TTL_MS,
  }).then((status) => {
    premiumCache.set(userId, { status, fetchedAt: Date.now() });
    return status;
  });
  premiumRequests.set(userId, request);
  try {
    return await request;
  } finally {
    premiumRequests.delete(userId);
  }
}

export function usePremiumStatus(enabled = true) {
  const { user } = useAuth();
  const initial = cachedPremiumStatus(user?.id);
  const [status, setStatus] = useState<PremiumStatus>(initial?.status ?? FREE_STATUS);
  const [loading, setLoading] = useState(Boolean(enabled && user && !initial));

  const refresh = useCallback(async (force = false) => {
    if (!enabled || !user) {
      setStatus(FREE_STATUS);
      setLoading(false);
      return;
    }

    const cached = cachedPremiumStatus(user.id);
    if (!cached) setLoading(true);

    try {
      setStatus(await requestPremiumStatus(user.id, force));
    } catch {
      if (!cached) setStatus(FREE_STATUS);
    } finally {
      setLoading(false);
    }
  }, [enabled, user]);

  // Admin tarifni o'zgartirganda user sahifani to'liq yangilamasdan ham
  // yangi holatni ko'rishi uchun oyna fokusga qaytganda qayta so'raymiz.
  useEffect(() => {
    if (!enabled) return;

    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [enabled, refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
