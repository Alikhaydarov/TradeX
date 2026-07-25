"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiRequest } from "@/lib/api-client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInWithOAuth: (provider: AuthProviderName) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ error: string | null; requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

export type AuthProviderName = "google" | "apple";

const AUTH_CACHE_KEY = "tradeup:user";
const AuthContext = createContext<AuthContextValue | null>(null);

function readCachedUser() {
  if (typeof window === "undefined") return null;

  try {
    const cached = window.localStorage.getItem(AUTH_CACHE_KEY);
    return cached ? (JSON.parse(cached) as User) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null) {
  if (typeof window === "undefined") return;

  try {
    if (user) window.localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(AUTH_CACHE_KEY);
  } catch {
    // Ignore storage errors; server auth remains the source of truth.
  }
}

export function AuthProvider({
  children,
  initialUser = null,
  initialConfigured = true,
}: {
  children: ReactNode;
  initialUser?: User | null;
  initialConfigured?: boolean;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [configured, setConfigured] = useState(initialConfigured);
  const [loading] = useState(false);

  useEffect(() => {
    let active = true;
    let cacheTimer: number | null = null;
    const cached = readCachedUser();
    if (!initialUser && cached) {
      cacheTimer = window.setTimeout(() => {
        if (active) setUser(cached);
      }, 0);
    }

    apiRequest<{ user: User | null }>("/api/auth/me")
      .then((auth) => {
        if (!active) return;
        setUser(auth.user);
        writeCachedUser(auth.user);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        writeCachedUser(null);
      });

    apiRequest<{ ok: boolean }>("/api/health")
      .then((health) => {
        if (active) setConfigured(health.ok);
      })
      .catch(() => {
        if (active) setConfigured(false);
      });

    return () => {
      active = false;
      if (cacheTimer) window.clearTimeout(cacheTimer);
    };
  }, [initialUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured,
      async signInWithOAuth(provider) {
        if (!configured) return "Backend auth is not configured yet.";
        window.location.assign(`/api/auth/oauth/${provider}`);
        return null;
      },
      async signInWithGoogle() {
        if (!configured) return "Backend auth is not configured yet.";
        window.location.assign("/api/auth/oauth/google");
        return null;
      },
      async signInWithPassword(email, password) {
        if (!configured) return "Backend auth is not configured yet.";
        try {
          await apiRequest<{ ok: true }>("/api/auth/password", {
            method: "POST",
            body: JSON.stringify({ mode: "login", email, password }),
          });
          window.location.assign("/");
          return null;
        } catch (error) {
          return error instanceof Error ? error.message : "Sign in failed.";
        }
      },
      async signUpWithPassword(name, email, password) {
        if (!configured) {
          return {
            error: "Backend auth is not configured yet.",
            requiresEmailConfirmation: false,
          };
        }
        try {
          const result = await apiRequest<{
            ok: true;
            requiresEmailConfirmation: boolean;
          }>("/api/auth/password", {
            method: "POST",
            body: JSON.stringify({ mode: "register", name, email, password }),
          });
          if (!result.requiresEmailConfirmation) window.location.assign("/");
          return {
            error: null,
            requiresEmailConfirmation: result.requiresEmailConfirmation,
          };
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : "Registration failed.",
            requiresEmailConfirmation: false,
          };
        }
      },
      async signOut() {
        await apiRequest<{ ok: boolean }>("/api/auth/signout", { method: "POST" });
        setUser(null);
        writeCachedUser(null);
      },
    }),
    [configured, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth AuthProvider ichida ishlatilishi kerak");
  return context;
}
