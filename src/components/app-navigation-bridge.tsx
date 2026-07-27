"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { APP_NAVIGATE_EVENT, type AppNavigationOptions } from "@/lib/app-navigation";

type NavigationDetail = AppNavigationOptions & { path: string };

export function AppNavigationBridge() {
  const router = useRouter();

  useEffect(() => {
    const navigate = (event: Event) => {
      const detail = (event as CustomEvent<NavigationDetail>).detail;
      if (!detail?.path) return;
      const options = { scroll: detail.scroll !== false };
      if (detail.replace) router.replace(detail.path, options);
      else router.push(detail.path, options);
    };

    window.addEventListener(APP_NAVIGATE_EVENT, navigate);
    return () => window.removeEventListener(APP_NAVIGATE_EVENT, navigate);
  }, [router]);

  return null;
}
