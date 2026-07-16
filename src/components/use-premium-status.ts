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

export function usePremiumStatus(enabled = true) {
  const { user } = useAuth();
  const [status, setStatus] = useState<PremiumStatus>(FREE_STATUS);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [refreshKey, setRefreshKey] = useState(0);

  // Admin tarifni o'zgartirganda user sahifani to'liq yangilamasdan ham
  // yangi holatni ko'rishi uchun oyna fokusga qaytganda qayta so'raymiz.
  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      if (document.visibilityState === "visible") {
        setRefreshKey((key) => key + 1);
      }
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [enabled]);

  const refresh = useCallback(async () => {
    if (!enabled || !user) {
      setStatus(FREE_STATUS);
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest<PremiumStatus>("/api/premium/status");
      setStatus(response);
    } catch {
      setStatus(FREE_STATUS);
    } finally {
      setLoading(false);
    }
  }, [enabled, user]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh, refreshKey]);

  return { status, loading, refresh };
}
