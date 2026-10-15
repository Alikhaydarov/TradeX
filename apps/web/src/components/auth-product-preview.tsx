"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  LayoutDashboard,
} from "lucide-react";
import { useState } from "react";

export function AuthProductPreview() {
  const [tab, setTab] = useState<"overview" | "calendar">("overview");
  const reduced = useReducedMotion();
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className="auth-product-preview"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.6, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <div className="auth-preview-toolbar">
          <span className="auth-preview-wordmark">
            tr<span>.</span>
          </span>
          <strong>Your trading workspace</strong>
          <span className="auth-preview-badge">Product preview</span>
        </div>
        <div className="auth-preview-nav">
          <button
            aria-pressed={tab === "overview"}
            onClick={() => setTab("overview")}
          >
            <LayoutDashboard size={14} />
            Overview
          </button>
          <button
            aria-pressed={tab === "calendar"}
            onClick={() => setTab("calendar")}
          >
            <CalendarDays size={14} />
            Calendar
          </button>
          <span>
            <Check size={12} />
            All in one place
          </span>
        </div>
        {tab === "overview" ? (
          <div className="auth-preview-overview">
            <div className="auth-preview-stat">
              <span>NET PERFORMANCE</span>
              <strong>
                +$12,840<small>.20</small>
              </strong>
              <p>
                <ArrowUpRight size={13} />
                An overview of every decision.
              </p>
            </div>
            <div className="auth-preview-chart" aria-hidden="true">
              <div>
                <i />
                <i />
                <i />
              </div>
              <svg viewBox="0 0 600 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient
                    id="auth-preview-area"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop stopColor="#86efac" stopOpacity=".13" />
                    <stop offset="1" stopColor="#86efac" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 135 L30 126 L58 131 L90 110 L120 116 L150 90 L180 103 L210 75 L240 85 L270 57 L300 74 L330 61 L360 68 L390 42 L420 51 L450 24 L480 39 L510 21 L540 30 L570 9 L600 15 L600 150 L0 150Z"
                  fill="url(#auth-preview-area)"
                />
                <m.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reduced ? 0 : 1.2, ease: "easeOut" }}
                  d="M0 135 L30 126 L58 131 L90 110 L120 116 L150 90 L180 103 L210 75 L240 85 L270 57 L300 74 L330 61 L360 68 L390 42 L420 51 L450 24 L480 39 L510 21 L540 30 L570 9 L600 15"
                  stroke="#86efac"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>
            <div className="auth-preview-summary">
              <div>
                <span>Win rate</span>
                <strong>68.2%</strong>
              </div>
              <div>
                <span>Profit factor</span>
                <strong>2.14</strong>
              </div>
              <div>
                <span>Average return</span>
                <strong>
                  1.86<small>R</small>
                </strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="auth-preview-calendar">
            <header>
              <strong>October 2026</strong>
              <span>A month of perspective.</span>
            </header>
            <div>
              {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                <span key={i}>{day}</span>
              ))}
              {Array.from({ length: 28 }, (_, index) => (
                <div
                  key={index}
                  className={
                    index % 7 > 4 ? "" : index % 5 === 0 ? "loss" : "win"
                  }
                >
                  <b>{index + 1}</b>
                  {index % 7 < 5 && (
                    <small>
                      {index % 5 === 0
                        ? "−0.5R"
                        : "+" + (1 + (index % 3)).toFixed(1) + "R"}
                    </small>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="auth-preview-bottom">
          <ChartNoAxesCombined size={15} />
          <span>Find the patterns. Build your edge.</span>
          <span>Tradoxy</span>
        </div>
      </m.div>
    </LazyMotion>
  );
}
