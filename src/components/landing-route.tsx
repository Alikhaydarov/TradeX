"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthModal } from "./auth-modal";
import { useAuth } from "./auth-context";
import { TradeWayLoginLanding } from "./tradeway-login-landing";

type AuthMode = "login" | "register";

export function LandingRoute() {
  const router = useRouter();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  useEffect(() => {
    if (user) router.replace("/home");
  }, [router, user]);

  if (user) return <div className="min-h-dvh bg-black" aria-hidden="true" />;

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <>
      <TradeWayLoginLanding
        onLogin={() => openAuth("login")}
        onRegister={() => openAuth("register")}
      />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
