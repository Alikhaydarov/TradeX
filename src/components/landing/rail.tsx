"use client";

import { useRef } from "react";
import { BarChart3, NotebookPen, Users } from "lucide-react";

import { readPin, useReducedMotion, useScrollSignal } from "./scroll-3d";

const ANGLES = [
  {
    icon: NotebookPen,
    title: "Journal",
    body: "Every trade keeps the setup, the risk and the note you wrote at the time. The reasoning survives the result.",
    art: (
      <div className="grid gap-2">
        {[
          ["MNQ", "Opening range", "+$603.00", true],
          ["EURUSD", "London reversal", "−$182.40", false],
          ["XAUUSD", "Trend continuation", "+$914.25", true],
        ].map(([sym, setup, pnl, win]) => (
          <div
            key={sym as string}
            className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[.03] px-3 py-2"
          >
            <span className="w-16 text-[11px] font-medium text-white">{sym}</span>
            <span className="flex-1 truncate text-[11px] text-white/45">{setup}</span>
            <span
              className={`text-[11px] tabular-nums ${
                win ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {pnl}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: BarChart3,
    title: "Analytics",
    body: "Net P&L, win rate and profit factor across every connected account, with a calendar that shows the streaks.",
    art: (
      <div className="rounded-lg border border-white/8 bg-white/[.03] p-4">
        <p className="text-[11px] uppercase tracking-[.16em] text-white/60">Net P&amp;L</p>
        <p className="mt-1 text-[26px] font-light tabular-nums text-emerald-300">
          +$12,840
        </p>
        <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="mt-3 h-16 w-full">
          <path
            d="M0 50 L25 44 L50 47 L75 32 L100 36 L125 22 L150 27 L175 13 L200 6"
            fill="none"
            stroke="#fff"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
  },
  {
    icon: Users,
    title: "Community",
    body: "Share results that came from a real synced account, inside a private space where the numbers can be checked.",
    art: (
      <div className="rounded-lg border border-white/8 bg-white/[.03] p-4">
        <div className="flex -space-x-2">
          {["AK", "MR", "JL", "SD", "+8"].map((initials) => (
            <span
              key={initials}
              className="grid size-8 place-items-center rounded-full border border-black bg-white/12 text-[10px] text-white"
            >
              {initials}
            </span>
          ))}
        </div>
        <p className="mt-4 text-[11px] uppercase tracking-[.16em] text-white/60">
          Weekly review
        </p>
        <p className="mt-1 text-[15px] font-light text-white">12 traders checked in</p>
      </div>
    ),
  },
];

/**
 * Three cards that travel sideways while the section holds the viewport.
 *
 * The horizontal distance is driven by how far the tall outer section has
 * scrolled, so the reader moves through the three angles with the same gesture
 * they use for the rest of the page - no trapped wheel, no hijacked scrolling.
 */
export function LandingRail() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useScrollSignal(sectionRef, (_progress, _leave, node) => {
    const pin = readPin(node);

    const frame = frameRef.current;
    if (frame) frame.style.transform = `translate3d(0, ${pin.offset}px, 0)`;

    const track = trackRef.current;
    if (!track) return;
    const distance = Math.max(0, track.scrollWidth - track.clientWidth);
    // Hold still briefly at each end so the first and last card can be read.
    const eased = Math.min(1, Math.max(0, (pin.progress - 0.08) / 0.84));
    track.style.transform = `translate3d(${-eased * distance}px, 0, 0)`;
  });

  // Without motion the rail would sit pinned and never travel, hiding two of
  // the three cards. Stack them instead - the same content, read by scrolling
  // the page normally.
  if (reduced) {
    return (
      <section
        className="mx-auto w-[min(1180px,calc(100%-48px))] py-24 max-sm:w-[min(calc(100%-30px),1180px)]"
        aria-labelledby="angles-heading"
      >
        <p className="text-[11px] uppercase tracking-[.18em] text-white/55">
          The workspace
        </p>
        <h2
          id="angles-heading"
          className="mt-3 text-[clamp(26px,3.6vw,44px)] font-light leading-[1.15] tracking-[-0.02em] text-white"
        >
          One workspace. Three angles.
        </h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {ANGLES.map((angle) => (
            <article
              key={angle.title}
              className="flex flex-col justify-between rounded-2xl border border-white/8 bg-[#0b0b0b] p-8 max-sm:p-6"
            >
              <div>
                <angle.icon size={20} className="text-white/50" />
                <h3 className="mt-6 text-[clamp(22px,2.6vw,30px)] font-light tracking-[-0.02em] text-white">
                  {angle.title}
                </h3>
                <p className="mt-3 text-[13px] leading-6 text-white/50">{angle.body}</p>
              </div>
              <div className="mt-8">{angle.art}</div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="relative h-[260vh]"
      aria-labelledby="angles-heading"
    >
      <div
        ref={frameRef}
        className="absolute inset-x-0 top-0 flex h-svh flex-col justify-center overflow-hidden will-change-transform"
      >
        <div className="mx-auto w-[min(1180px,calc(100%-48px))] max-sm:w-[min(calc(100%-30px),1180px)]">
          <p className="text-[11px] uppercase tracking-[.18em] text-white/55">
            The workspace
          </p>
          <h2
            id="angles-heading"
            className="mt-3 text-[clamp(26px,3.6vw,44px)] font-light leading-[1.15] tracking-[-0.02em] text-white"
          >
            One workspace. Three angles.
          </h2>
        </div>

        <div className="mt-10 overflow-hidden">
          <div
            ref={trackRef}
            className="flex gap-4 px-[max(24px,calc((100%-1180px)/2))] will-change-transform max-sm:px-[15px]"
          >
            {ANGLES.map((angle) => (
              <article
                key={angle.title}
                className="flex w-[min(560px,82vw)] shrink-0 flex-col justify-between rounded-2xl border border-white/8 bg-[#0b0b0b] p-8 max-sm:p-6"
              >
                <div>
                  <angle.icon size={20} className="text-white/50" />
                  <h3 className="mt-6 text-[clamp(22px,2.6vw,30px)] font-light tracking-[-0.02em] text-white">
                    {angle.title}
                  </h3>
                  <p className="mt-3 max-w-sm text-[13px] leading-6 text-white/50">
                    {angle.body}
                  </p>
                </div>
                <div className="mt-8">{angle.art}</div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
