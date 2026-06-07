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

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
  initialConfigured = false,
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

    apiRequest<{ user: User | null }>("/api/auth/me")
      .then((auth) => {
        if (active) setUser(auth.user);
      })
      .catch(() => {
        if (active) setUser(null);
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
