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
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

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
  const [user, setUser] = useState<User | null>(() => initialUser ?? readCachedUser());
  const [configured, setConfigured] = useState(initialConfigured);
  const [loading] = useState(false);

  useEffect(() => {
    let active = true;

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
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured,
      async signInWithGoogle() {
        if (!configured) return "Backend auth hali sozlanmagan.";
        window.location.assign("/api/auth/google");
        return null;
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
