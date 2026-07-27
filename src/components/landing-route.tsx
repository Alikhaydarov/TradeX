"use client";

import { useState } from "react";

import { AuthModal } from "./auth-modal";
import { useAuth } from "./auth-context";
import { TradeWayLoginLanding } from "./tradeway-login-landing";
import { FeedRoute } from "./routes/workspace-pages";

type AuthMode = "login" | "register";

export function LandingRoute() {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  if (user) return <FeedRoute />;

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
