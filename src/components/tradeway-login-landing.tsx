"use client";

import { ArrowRight, BarChart3, BookOpen, Check, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const PLATFORMS = ["Tradovate", "cTrader", "MT5", "NinjaTrader", "TradingView", "DXtrade"];

function MarketCanvas() {
  return (
    <div className="auth3-market" aria-hidden="true">
      <div className="auth3-market-head">
        <span><i /> Live performance</span>
        <b>30D</b>
      </div>
      <div className="auth3-market-value">
        <div><small>Net P&amp;L</small><strong>+$12,840.20</strong></div>
        <span>+18.4%</span>
      </div>
      <svg viewBox="0 0 720 260" preserveAspectRatio="none">
        <defs>
          <linearGradient id="tradeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".18" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="auth3-area" d="M0 222L55 205L105 212L158 166L212 179L267 135L322 153L376 96L430 117L484 77L538 92L590 48L645 62L720 25V260H0Z" />
        <path className="auth3-line" pathLength="1" d="M0 222L55 205L105 212L158 166L212 179L267 135L322 153L376 96L430 117L484 77L538 92L590 48L645 62L720 25" />
      </svg>
      <div className="auth3-stat-row">
        <div><span>Win rate</span><b>68.2%</b></div>
        <div><span>Profit factor</span><b>2.14</b></div>
        <div><span>Best streak</span><b>9 trades</b></div>
      </div>
      <div className="auth3-float auth3-float-a"><Check size={13} /> Plan followed</div>
      <div className="auth3-float auth3-float-b"><span>R</span><div><small>Risk today</small><b>0.72%</b></div></div>
    </div>
  );
}

export function TradeWayLoginLanding({
  onLogin,
  onRegister,
}: {
  onLogin: () => void;
  onRegister: () => void;
}) {
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("auth_error");
    if (!code) return;
    const messages: Record<string, string> = {
      not_configured: "Authentication is not configured yet.",
      unsupported_provider: "That sign-in method is not supported.",
      oauth_start: "This provider is not enabled yet. Please use another sign-in method.",
      oauth: "Sign-in could not be completed. Please try again.",
    };
    setAuthError(messages[code] ?? "Sign-in could not be completed.");
    url.searchParams.delete("auth_error");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  return (
    <main className="auth3-shell">
      <div className="auth3-noise" aria-hidden="true" />
      <nav className="auth3-nav">
        <Link href="/" className="auth3-logo" aria-label="Tradox home"><b>TD</b><span>Tradox</span></Link>
        <div className="auth3-navlinks">
          <a href="#workflow">Product</a>
          <Link href="/pricing">Pricing</Link>
          <button onClick={onLogin}>Sign in</button>
          <button className="auth3-nav-cta" onClick={onRegister}>Get started</button>
        </div>
      </nav>

      {authError && <div className="auth3-error" role="alert">{authError}<button onClick={() => setAuthError(null)} aria-label="Dismiss"><span aria-hidden="true">×</span></button></div>}

      <section className="auth3-hero">
        <div className="auth3-copy">
          <div className="auth3-eyebrow"><span /> Built for deliberate traders</div>
          <h1>Trade less.<br /><em>Learn faster.</em></h1>
          <p>One focused workspace to journal decisions, measure execution and share verified progress with traders you trust.</p>
          <div className="auth3-actions">
            <button onClick={onRegister}>Start for free <ArrowRight size={17} /></button>
            <button onClick={onLogin}>I have an account</button>
          </div>
          <div className="auth3-proof">
            <span><ShieldCheck size={15} /> Secure Supabase auth</span>
            <span><Check size={15} /> No card required</span>
          </div>
        </div>
        <div className="auth3-visual"><MarketCanvas /></div>
      </section>

      <section className="auth3-platforms">
        <p>Fits your existing trading workflow</p>
        <div>{PLATFORMS.map((platform) => <span key={platform}>{platform}</span>)}</div>
      </section>

      <section className="auth3-workflow" id="workflow">
        <div className="auth3-section-title">
          <span>THE DAILY LOOP</span>
          <h2>Everything around the trade.<br />None of the noise.</h2>
        </div>
        <div className="auth3-feature-grid">
          <article><BookOpen /><span>01</span><h3>Journal the decision</h3><p>Capture setup, risk and psychology while the context is still fresh.</p></article>
          <article><BarChart3 /><span>02</span><h3>Find the pattern</h3><p>Turn executions into clean performance insights you can act on.</p></article>
          <article><Users /><span>03</span><h3>Improve together</h3><p>Share verified progress inside private, focused trader communities.</p></article>
        </div>
      </section>

      <section className="auth3-final">
        <div><span>YOUR NEXT SESSION STARTS HERE</span><h2>Build a trading process<br />you can actually repeat.</h2></div>
        <button onClick={onRegister}>Create your workspace <ArrowRight size={18} /></button>
      </section>

      <footer className="auth3-footer"><Link href="/" className="auth3-logo"><b>TD</b><span>Tradox</span></Link><p>Trading clarity, one session at a time.</p><span>© 2026 Tradox</span></footer>
    </main>
  );
}
