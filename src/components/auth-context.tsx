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
  profile: AuthProfileIdentity | null;
  loading: boolean;
  configured: boolean;
  signInWithOAuth: (provider: AuthProviderName) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<string | null>;
  signUpWithPassword: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ error: string | null; requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

export interface AuthProfileIdentity {
  username: string;
  fullName: string;
  avatarUrl: string;
}

export type AuthProviderName = "google" | "apple";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
  initialProfile = null,
  initialConfigured = true,
}: {
  children: ReactNode;
  initialUser?: User | null;
  initialProfile?: AuthProfileIdentity | null;
  initialConfigured?: boolean;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<AuthProfileIdentity | null>(
    initialProfile,
  );
  const configured = initialConfigured;
  const [loading] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    if (initialProfile && user.id === initialUser?.id) return;

    let active = true;
    apiRequest<{
      profile: {
        username?: string | null;
        full_name?: string | null;
        avatar_url?: string | null;
      };
    }>("/api/profile", { cacheMs: 60_000 })
      .then(({ profile: nextProfile }) => {
        if (!active) return;
        setProfile({
          username: nextProfile.username || "",
          fullName: nextProfile.full_name || "",
          avatarUrl: nextProfile.avatar_url || "",
        });
      })
      .catch(() => {
        if (active) setProfile(null);
      });

    return () => {
      active = false;
    };
  }, [initialProfile, initialUser?.id, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
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
            error:
              error instanceof Error ? error.message : "Registration failed.",
            requiresEmailConfirmation: false,
          };
        }
      },
      async signOut() {
        await apiRequest<{ ok: boolean }>("/api/auth/signout", {
          method: "POST",
        });
        setUser(null);
        setProfile(null);
      },
    }),
    [configured, loading, profile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth AuthProvider ichida ishlatilishi kerak");
  return context;
}
