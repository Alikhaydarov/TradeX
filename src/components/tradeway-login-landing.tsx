"use client";

import { ArrowRight, BarChart3, BookOpen, Check, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { LandingFaq } from "./landing/faq";
import { LandingMetrics } from "./landing/metrics";
import { LandingPlans } from "./landing/plans";
import { Scroll3D, Scroll3DStage } from "./landing/scroll-3d";
import { LandingSteps } from "./landing/steps";
import { LandingShowcase3D } from "./landing-showcase-3d";
import { AUTH_LANDING_TAILWIND_CLASS } from "./tailwind/auth-tailwind-classes";
import { TradoxyMark } from "./tradoxy-mark";

const PLATFORMS = [
  { name: "Tradovate", logo: "/platforms/tradovate.png", note: "Futures" },
  { name: "cTrader", logo: "/platforms/ctrader.svg", note: "Forex & CFD" },
  { name: "MetaTrader 5", logo: "/platforms/metatrader5.png", note: "Multi-asset" },
  { name: "NinjaTrader", logo: "/platforms/ninjatrader.png", note: "Futures" },
  { name: "TradeLocker", logo: "/platforms/tradelocker.png", note: "Multi-asset" },
  { name: "Match-Trader", logo: "/platforms/matchtrader.png", note: "Forex & CFD" },
  { name: "ProjectX", logo: "/platforms/projectx.png", note: "Futures" },
];

function PlatformPreview() {
  return (
    <div className="auth3-platform-preview" aria-hidden="true">
      <div className="auth3-preview-side">
        <span className="active"><BarChart3 size={15} /> Overview</span>
        <span><BookOpen size={15} /> Journal</span>
        <span><Users size={15} /> Community</span>
      </div>
      <div className="auth3-preview-main">
        <div className="auth3-preview-top"><span>Connected accounts</span><b><i /> Synced now</b></div>
        <div className="auth3-preview-cards">
          <div><small>Combined balance</small><strong>$48,240</strong><span>4 accounts</span></div>
          <div><small>Execution score</small><strong>91.4</strong><span>Top 8%</span></div>
        </div>
        <div className="auth3-preview-chart">
          {[44, 62, 38, 74, 54, 88, 68, 96, 78, 112, 94, 128].map((height, index) => (
            <i key={index} style={{ height }} />
          ))}
        </div>
      </div>
    </div>
  );
}

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

export function TradoxyLoginLanding({
  onLogin,
  onRegister,
}: {
  onLogin: () => void;
  onRegister: () => void;
}) {
  const [authError, setAuthError] = useState<string | null>(null);
  const shellRef = useRef<HTMLElement>(null);

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

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const targets = Array.from(shell.querySelectorAll<HTMLElement>("[data-reveal]"));
    shell.classList.add("auth3-motion-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <main ref={shellRef} className={AUTH_LANDING_TAILWIND_CLASS}>
      <div className="auth3-noise" aria-hidden="true" />
      <nav className="auth3-nav">
        <Link href="/" className="auth3-logo" aria-label="Tradoxy home"><b><TradoxyMark className="size-4 text-black" /></b><span>Tradoxy</span></Link>
        <div className="auth3-navlinks">
          <a href="#workflow">Product</a>
          <a href="#how">How it works</a>
          <a href="#plans">Plans</a>
          <a href="#faq">FAQ</a>
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
            <span><ShieldCheck size={15} /> Secure sign-in</span>
            <span><Check size={15} /> No card required</span>
          </div>
        </div>
        <Scroll3DStage className="auth3-visual" perspective={1600}>
          <Scroll3D enter={false} depth={260} rotate={14} lift={40}>
            <MarketCanvas />
          </Scroll3D>
        </Scroll3DStage>
      </section>

      <section className="auth3-platforms">
        <p>Fits your existing trading workflow</p>
        <div>
          {PLATFORMS.map((platform) => (
            <span key={platform.name}>
              <Image src={platform.logo} alt="" width={24} height={24} />
              {platform.name}
            </span>
          ))}
        </div>
      </section>

      <LandingMetrics />

      <section className="auth3-workflow" id="workflow">
        <div className="auth3-section-title" data-reveal>
          <span>THE DAILY LOOP</span>
          <h2>Everything around the trade.<br />None of the noise.</h2>
        </div>
        <Scroll3DStage className="auth3-feature-grid">
          <Scroll3D as="article" depth={190} rotate={10} lift={44}>
            <BookOpen /><span>01</span><h3>Journal the decision</h3><p>Capture setup, risk and psychology while the context is still fresh.</p>
            <div className="auth3-feature-art auth3-note-art" aria-hidden="true">
              <div><small>SETUP</small><b>London continuation</b></div>
              <p>Waited for the retest. Risk stayed inside plan.</p>
              <span><i /> A+ execution</span>
            </div>
          </Scroll3D>
          <Scroll3D as="article" delay={0.07} depth={190} rotate={10} lift={44}>
            <BarChart3 /><span>02</span><h3>Find the pattern</h3><p>Turn executions into clean performance insights you can act on.</p>
            <div className="auth3-feature-art auth3-bars-art" aria-hidden="true">
              <div><span>Mon</span><i style={{ height: "44%" }} /></div>
              <div><span>Tue</span><i style={{ height: "72%" }} /></div>
              <div><span>Wed</span><i style={{ height: "56%" }} /></div>
              <div><span>Thu</span><i style={{ height: "88%" }} /></div>
              <div><span>Fri</span><i style={{ height: "64%" }} /></div>
            </div>
          </Scroll3D>
          <Scroll3D as="article" delay={0.14} depth={190} rotate={10} lift={44}>
            <Users /><span>03</span><h3>Improve together</h3><p>Share verified progress inside private, focused trader communities.</p>
            <div className="auth3-feature-art auth3-community-art" aria-hidden="true">
              <div className="auth3-avatar-stack"><i>AK</i><i>MR</i><i>JL</i><i>+8</i></div>
              <div><small>WEEKLY REVIEW</small><b>12 traders checked in</b></div>
              <span><i /> Private space</span>
            </div>
          </Scroll3D>
        </Scroll3DStage>
      </section>

      <LandingSteps />

      <LandingShowcase3D />

      <section className="auth3-integrations" id="integrations">
        <div className="auth3-integration-copy" data-reveal>
          <span>ONE WORKSPACE, EVERY ACCOUNT</span>
          <h2>Your platforms stay yours.<br />Tradoxy makes them useful.</h2>
          <p>Bring results from the tools you already trade with into one clear review workflow. Compare accounts, understand execution and keep your journal attached to the numbers.</p>
          <div className="auth3-integration-points">
            <span><Check size={14} /> Unified performance view</span>
            <span><Check size={14} /> Account-level privacy controls</span>
            <span><Check size={14} /> Fast CSV and connector workflows</span>
          </div>
        </div>
        <div data-reveal><PlatformPreview /></div>
      </section>

      <section className="auth3-platform-grid" aria-label="Supported trading platforms">
        {PLATFORMS.map((platform, index) => (
          <article key={platform.name} data-reveal>
            <div className="auth3-platform-logo">
              <Image src={platform.logo} alt={`${platform.name} logo`} width={44} height={44} />
            </div>
            <div><h3>{platform.name}</h3><p>{platform.note}</p></div>
            <span>{String(index + 1).padStart(2, "0")}</span>
          </article>
        ))}
      </section>

      <LandingPlans />

      <LandingFaq />

      <section className="auth3-final" data-reveal>
        <div><span>YOUR NEXT SESSION STARTS HERE</span><h2>Build a trading process<br />you can actually repeat.</h2></div>
        <button onClick={onRegister}>Create your workspace <ArrowRight size={18} /></button>
      </section>

      <footer className="auth3-footer"><Link href="/" className="auth3-logo"><b><TradoxyMark className="size-4 text-black" /></b><span>Tradoxy</span></Link><p>Trading clarity, one session at a time.</p><span>© 2026 Tradoxy</span></footer>
    </main>
  );
}
