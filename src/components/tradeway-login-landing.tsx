"use client";

import { LockKeyhole, Star } from "lucide-react";
import { useState } from "react";
import { useAuth } from "./auth-context";
import { Button } from "./ui/button";

const PLATFORMS = [
  { name: "Tradovate", mark: "TV" },
  { name: "cTrader", mark: "cT" },
  { name: "MT5", mark: "M5" },
  { name: "NinjaTrader", mark: "NT" },
  { name: "TradingView", mark: "TV" },
  { name: "DXtrade", mark: "DX" },
];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4">
      <path
        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12s3.36-7.27 7.19-7.27c3.08 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.19 2C6.42 2 2.03 6.8 2.03 12s4.39 10 10.16 10c5.05 0 9.81-3.55 9.81-10.13 0-.83-.09-1.31-.09-1.31z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChartLine() {
  return (
    <svg className="auth2-chart-line" viewBox="0 0 1400 400" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="auth2ChartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(59,130,246,0.2)" />
          <stop offset="55%" stopColor="rgba(34,197,94,0.08)" />
          <stop offset="100%" stopColor="rgba(59,130,246,0)" />
        </linearGradient>
      </defs>
      <path className="auth2-chart-fill" d="M0,260 L60,240 L130,270 L200,210 L280,235 L350,180 L420,205 L500,150 L580,175 L660,130 L740,160 L820,110 L900,140 L980,95 L1060,125 L1140,85 L1220,110 L1300,70 L1400,95 L1400,400 L0,400 Z" />
      <path className="auth2-chart-stroke" d="M0,260 L60,240 L130,270 L200,210 L280,235 L350,180 L420,205 L500,150 L580,175 L660,130 L740,160 L820,110 L900,140 L980,95 L1060,125 L1140,85 L1220,110 L1300,70 L1400,95" />
    </svg>
  );
}

function PlatformStrip() {
  return (
    <div className="auth2-platforms" aria-label="Supported trading platforms">
      <p>Connect your workflow</p>
      <div>
        {PLATFORMS.map((platform) => (
          <span key={platform.name} className="auth2-platform-pill">
            <b>{platform.mark}</b>
            {platform.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TradeWayLoginLanding({ onLogin }: { onLogin: () => void }) {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const loginWithGoogle = async () => {
    setError(null);
    setPending(true);
    const nextError = await signInWithGoogle();
    if (nextError) {
      setError(nextError);
      setPending(false);
    }
  };

  return (
    <main className="auth2-wrap min-h-[100dvh] overflow-hidden bg-black text-[#f5f5f5]">
      <div className="auth2-bg" aria-hidden="true">
        <div className="auth2-grid" />
        <div className="auth2-orb auth2-orb-1" />
        <div className="auth2-orb auth2-orb-2" />
        <div className="auth2-orb auth2-orb-3" />
        <div className="auth2-vignette" />
        <ChartLine />
      </div>

      <nav className="auth2-nav">
        <div className="auth2-brand">
          <span className="auth2-mark">TD</span>
          <span>Tradox</span>
        </div>
        <div className="auth2-status"><span />All systems normal</div>
      </nav>

      <section className="auth2-stage">
        <div className="auth2-card">
          <div className="auth2-head">
            <p>PRIVATE WORKSPACE</p>
            <h1>Sign in to your trading workspace</h1>
            <span>Journal, account progress, proof profile and trade sharing stay in one fast flow.</span>
          </div>

          <Button
            type="button"
            onClick={loginWithGoogle}
            disabled={pending}
            className="auth2-cta-primary h-auto w-full rounded-[10px] border-0"
          >
            {pending ? (
              <span className="inline-flex size-4 animate-spin rounded-full border-2 border-black/20 border-t-black" aria-hidden="true" />
            ) : (
              <GoogleIcon />
            )}
            {pending ? "Redirecting..." : "Continue with Google"}
          </Button>

          <Button type="button" variant="outline" onClick={onLogin} className="auth2-cta-secondary h-auto w-full rounded-[10px]">
            <LockKeyhole size={16} />
            More sign-in options
          </Button>

          {error && (
            <p className="mt-3 text-sm text-rose-400" role="alert">
              {error}
            </p>
          )}

          <div className="auth2-tabs" aria-hidden="true">
            <span className="active">Journal</span>
            <span>Accounts</span>
            <span>Proof</span>
          </div>

          <div className="auth2-note">
            <Star size={15} />
            <p><b>Trading plan first.</b> Risk, setup and review notes stay attached to each trade.</p>
          </div>

          <div className="auth2-features">
            <div>
              <p>Secure Auth</p>
              <span>Google OAuth</span>
            </div>
            <div>
              <p>Premium Ready</p>
              <span>AI + MT5</span>
            </div>
            <div>
              <p>Fast Journal</p>
              <span>Proof workflow</span>
            </div>
          </div>

          <p className="auth2-foot">
            By continuing, you agree to Tradox&apos;s <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </section>

      <PlatformStrip />
    </main>
  );
}
