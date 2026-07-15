"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    if (!user) {
      setStatus(FREE_STATUS);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    apiRequest<PremiumStatus>("/api/premium/status")
      .then((response) => {
        if (active) setStatus(response);
      })
      .catch(() => {
        if (active) setStatus(FREE_STATUS);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, user, refreshKey]);

  return { status, loading };
}
