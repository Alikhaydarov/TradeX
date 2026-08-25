"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseCookieOptions } from "../hosts";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

  if (!url || !publishableKey) return null;
  if (!browserClient) {
    browserClient = createBrowserClient(url, publishableKey, {
      // Undefined until the marketing and app hosts are configured separately,
      // at which point the cookie widens to cover both.
      cookieOptions: supabaseCookieOptions(),
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: { eventsPerSecond: 20 },
      },
    });
  }

  return browserClient;
}
