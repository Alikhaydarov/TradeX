"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "./auth-context";

export interface PremiumStatus {
  isPremium: boolean;
  aiEnabled: boolean;
  autoSyncEnabled: boolean;
  isVerified: boolean;
}

const FREE_STATUS: PremiumStatus = {
  isPremium: false,
  aiEnabled: false,
  autoSyncEnabled: false,
  isVerified: false,
};

export function usePremiumStatus(enabled = true) {
  const { user } = useAuth();
  const [status, setStatus] = useState<PremiumStatus>(FREE_STATUS);
  const [loading, setLoading] = useState(Boolean(enabled));

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
  }, [enabled, user]);

  return { status, loading };
}
