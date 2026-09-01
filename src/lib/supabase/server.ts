import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { getSupabaseConfig, isSupabaseConfigured } from "./config";

/**
 * Request-scoped Supabase client for server code.
 *
 * Wrapped in React's `cache()` so every caller inside a single request shares
 * one client instance. Creating the client is cheap, but sharing it is what
 * lets `getServerAuth()` (below, in ./session) dedupe the expensive part: the
 * `auth.getUser()` network hop to Supabase.
 */
export const getSupabaseServerClient = cache(async () => {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseConfig();

  return createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot write cookies. proxy.ts handles refreshes.
          }
        },
      },
    },
  );
});
