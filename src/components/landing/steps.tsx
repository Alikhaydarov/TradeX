"use client";

import { Link2, NotebookPen, LineChart, Share2 } from "lucide-react";

import { Scroll3D, Scroll3DStage } from "./scroll-3d";

const STEPS = [
  {
    icon: Link2,
    title: "Connect or start by hand",
    body: "Bring an account in from the platform you already trade, or keep a manual account. Manual accounts are free and need no card.",
    aside: ["Tradovate", "cTrader", "MT5", "NinjaTrader", "+3 more"],
  },
  {
    icon: NotebookPen,
    title: "Journal the decision",
    body: "Write the setup, the risk and the state you were in while the context is still fresh. The note stays attached to the result forever.",
    aside: ["Setup", "Risk", "Session", "Psychology"],
  },
  {
    icon: LineChart,
    title: "Review the month, not the last trade",
    body: "Net P&L, win rate, profit factor and a calendar that shows the streaks. One screen per account, or all of them together.",
    aside: ["Dashboard", "Calendar", "Analytics"],
  },
  {
    icon: Share2,
    title: "Share what actually happened",
    body: "Post progress that came from a real synced account into a private community, or export a clean share card for anywhere else.",
    aside: ["Community", "Share card", "Story & post"],
  },
];

/**
 * The loop a trader actually goes through, laid out as a scroll sequence.
 *
 * Each step rises out of depth as it reaches the reading position and keeps
 * drifting while you read it, so the page reads as one continuous movement
 * rather than four separate cards that pop in.
 */
export function LandingSteps() {
  return (
    <section
      id="how"
      className="relative z-[1] mx-auto w-[min(1180px,calc(100%-48px))] py-[110px] max-sm:w-[min(calc(100%-30px),1180px)] max-sm:py-20"
      aria-labelledby="steps-heading"
    >
      <div className="auth3-section-title" data-reveal>
        <span>HOW IT WORKS</span>
        <h2 id="steps-heading">
          Four steps.
          <br />
          Then the same four, every week.
        </h2>
      </div>

      <Scroll3DStage className="mt-12 space-y-4">
        {STEPS.map((step, index) => (
          <Scroll3D
            key={step.title}
            as="article"
            depth={200}
            rotate={10}
            lift={54}
            sustain
            className="group relative grid items-start gap-6 rounded-2xl border border-white/8 bg-white/[.02] p-7 sm:grid-cols-[auto_minmax(0,1fr)_auto] max-sm:p-6"
          >
            <div className="flex items-center gap-4">
              <span className="text-[13px] font-semibold tabular-nums tracking-[.2em] text-ink-faint">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.04]">
                <step.icon size={18} className="text-ink-soft" />
              </span>
            </div>

            <div className="min-w-0">
              <h3 className="text-[clamp(19px,2.2vw,24px)] font-semibold tracking-[-0.03em] text-white">
                {step.title}
              </h3>
              <p className="mt-2 max-w-2xl text-[14px] leading-7 text-ink-mute">
                {step.body}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 sm:max-w-[190px] sm:justify-end">
              {step.aside.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/8 bg-white/[.03] px-2.5 py-1 text-[11px] text-ink-subtle"
                >
                  {chip}
                </span>
              ))}
            </div>
          </Scroll3D>
        ))}
      </Scroll3DStage>
    </section>
  );
}
