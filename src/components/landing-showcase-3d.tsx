"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Globe2,
  NotebookPen,
  Table2,
  UserRound,
  Users,
} from "lucide-react";

type Screen = {
  id: string;
  label: string;
  title: string;
  benefit: string;
  icon: typeof BarChart3;
  render: () => React.ReactNode;
};

const money = (value: string) => (
  <span className="tabular-nums tracking-[-0.02em]">{value}</span>
);

/**
 * Miniature renders of the real screens. They are drawn from the same tokens
 * the app uses rather than being screenshots, so they cannot go stale when the
 * product moves, and they weigh nothing.
 */
const SCREENS: Screen[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    title: "See the account, not the noise",
    benefit:
      "Net P&L, win rate and profit factor for every connected account, on one screen.",
    icon: BarChart3,
    render: () => (
      <>
        <div className="flex items-baseline justify-between">
          <span className="text-[9px] uppercase tracking-[.16em] text-ink-faint">
            Net P&amp;L
          </span>
          <span className="rounded-md bg-white/8 px-1.5 py-0.5 text-[8px] text-ink-mute">
            30D
          </span>
        </div>
        <p className="mt-1 text-[22px] font-bold text-emerald-300">
          {money("+$12,840")}
        </p>
        <svg
          viewBox="0 0 200 56"
          preserveAspectRatio="none"
          className="mt-2 min-h-14 w-full flex-1"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="ls3d-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,.22)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <path
            d="M0 46 L22 40 L44 43 L66 30 L88 34 L110 22 L132 26 L154 14 L176 18 L200 6 L200 56 L0 56 Z"
            fill="url(#ls3d-fill)"
          />
          <path
            d="M0 46 L22 40 L44 43 L66 30 L88 34 L110 22 L132 26 L154 14 L176 18 L200 6"
            fill="none"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[
            ["Win rate", "68.2%"],
            ["Factor", "2.14"],
            ["Streak", "9"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md bg-white/[.03] px-1.5 py-1">
              <p className="text-[7px] uppercase tracking-wider text-ink-faint">{k}</p>
              <p className="text-[10px] font-semibold text-ink-strong">{v}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "journal",
    label: "Journal",
    title: "Every trade keeps its reasoning",
    benefit:
      "Setup, risk and the note you wrote at the time stay attached to the result.",
    icon: NotebookPen,
    render: () => (
      <>
        <span className="text-[9px] uppercase tracking-[.16em] text-ink-faint">
          Recent trades
        </span>
        <div className="mt-2 space-y-1.5">
          {[
            ["MNQ", "Opening range", "+$603.00", true],
            ["EURUSD", "London reversal", "−$182.40", false],
            ["XAUUSD", "Trend continuation", "+$914.25", true],
          ].map(([sym, setup, pnl, win]) => (
            <div
              key={sym as string}
              className="flex items-center gap-2 rounded-md border border-white/6 bg-white/[.02] px-2 py-1.5"
            >
              <span className="w-11 shrink-0 text-[9px] font-semibold text-ink-strong">
                {sym}
              </span>
              <span className="min-w-0 flex-1 truncate text-[8px] text-ink-faint">
                {setup}
              </span>
              <span
                className={`text-[9px] font-semibold tabular-nums ${
                  win ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {pnl}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 rounded-md border border-white/6 bg-white/[.02] px-2 py-1.5">
          <p className="text-[7px] uppercase tracking-wider text-ink-faint">Note</p>
          <p className="mt-0.5 text-[8px] leading-relaxed text-ink-mute">
            Waited for the retest. Risk stayed inside plan.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "trades",
    label: "Trades",
    title: "Filter the archive, not your memory",
    benefit:
      "Search by symbol, setup or note, narrow the date range, and read the whole table at once.",
    icon: Table2,
    render: () => (
      <>
        <div className="grid grid-cols-4 gap-1">
          {[
            ["Trades", "148"],
            ["Win rate", "68%"],
            ["Best", "+$914"],
            ["Avg R", "1.35R"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md bg-white/[.03] px-1.5 py-1">
              <p className="text-[7px] uppercase tracking-wider text-ink-faint">{k}</p>
              <p className="text-[10px] font-semibold text-ink-strong">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-[1fr_1fr_.7fr_1fr] gap-2 border-b border-white/8 pb-1 text-[7px] uppercase tracking-wider text-ink-faint">
          <span>Date</span>
          <span>Instrument</span>
          <span>Side</span>
          <span className="text-right">P&amp;L</span>
        </div>
        <div className="divide-y divide-white/5">
          {[
            ["12 Aug", "MNQ", "Buy", "+$603.00", true],
            ["12 Aug", "EURUSD", "Sell", "−$182.40", false],
            ["11 Aug", "XAUUSD", "Buy", "+$914.25", true],
            ["11 Aug", "ES", "Sell", "+$248.00", true],
          ].map(([date, sym, side, pnl, win]) => (
            <div
              key={`${date}-${sym}`}
              className="grid grid-cols-[1fr_1fr_.7fr_1fr] gap-2 py-1.5 text-[8px]"
            >
              <span className="text-ink-faint">{date}</span>
              <span className="font-semibold text-ink-strong">{sym}</span>
              <span className={side === "Buy" ? "text-emerald-300" : "text-rose-300"}>
                {side}
              </span>
              <span
                className={`text-right font-semibold tabular-nums ${
                  win ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {pnl}
              </span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "calendar",
    label: "Calendar",
    title: "Your month at a glance",
    benefit:
      "Spot the streaks and the bad days before they turn into a bad month.",
    icon: CalendarDays,
    render: () => {
      const days = [
        0, 1, -1, 2, 0, 1, 0, 2, 1, -1, 0, 1, 2, 0, 1, -1, 2, 1, 0, 1, 2, -1, 0,
        1, 2, 0, 1, 0,
      ];
      return (
        <>
          <div className="flex items-baseline justify-between">
            <span className="text-[9px] uppercase tracking-[.16em] text-ink-faint">
              August
            </span>
            <span className="text-[9px] font-semibold text-emerald-300">
              {money("+$4,120")}
            </span>
          </div>
          <div className="mt-2 grid max-w-[232px] grid-cols-7 gap-1">
            {days.map((state, i) => (
              <span
                key={i}
                className={`aspect-square rounded-[3px] ${
                  state === 2
                    ? "bg-emerald-400/70"
                    : state === 1
                      ? "bg-emerald-400/30"
                      : state === -1
                        ? "bg-rose-400/45"
                        : "bg-white/[.05]"
                }`}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[7px] text-ink-faint">
            <span className="inline-flex items-center gap-1">
              <i className="size-1.5 rounded-[2px] bg-emerald-400/70" /> Green day
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="size-1.5 rounded-[2px] bg-rose-400/45" /> Red day
            </span>
          </div>
        </>
      );
    },
  },
  {
    id: "economic",
    label: "Economic calendar",
    title: "Know what moves the session",
    benefit:
      "High-impact releases for the major markets, laid out on the month you are actually trading.",
    icon: Globe2,
    render: () => (
      <>
        <div className="flex items-baseline justify-between">
          <span className="text-[9px] uppercase tracking-[.16em] text-ink-faint">
            High impact
          </span>
          <span className="text-[8px] text-ink-mute">August</span>
        </div>
        <div className="mt-2 space-y-1.5">
          {[
            ["USD", "13:30", "Non-farm payrolls", "2N"],
            ["EUR", "10:00", "ECB rate decision", "1N"],
            ["GBP", "07:00", "CPI year over year", "1N"],
          ].map(([ccy, time, name, count]) => (
            <div
              key={name as string}
              className="flex items-center gap-2 rounded-md border border-white/6 bg-white/[.02] px-2 py-1.5"
            >
              <span className="w-8 shrink-0 text-[8px] font-semibold text-ink-strong">
                {ccy}
              </span>
              <span className="min-w-0 flex-1 truncate text-[8px] text-ink-mute">
                {name}
              </span>
              <span className="text-[8px] tabular-nums text-ink-faint">{time}</span>
              <span className="rounded bg-white/8 px-1 text-[7px] text-ink-mute">
                {count}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[7px] text-ink-faint">
          Forecast and previous on every release.
        </p>
      </>
    ),
  },
  {
    id: "community",
    label: "Community",
    title: "Progress you can actually verify",
    benefit:
      "Share results that came from real synced accounts, inside a private space.",
    icon: Users,
    render: () => (
      <>
        <span className="text-[9px] uppercase tracking-[.16em] text-ink-faint">
          Weekly review
        </span>
        <div className="mt-2 flex -space-x-1.5">
          {["AK", "MR", "JL", "SD", "+8"].map((initials) => (
            <span
              key={initials}
              className="grid size-6 place-items-center rounded-full border border-black bg-white/10 text-[7px] font-semibold text-ink-strong"
            >
              {initials}
            </span>
          ))}
        </div>
        <div className="mt-2 space-y-1.5">
          {[
            ["Kaze T.", "+2.40R", true],
            ["Miraziz", "+1.15R", true],
            ["Dilshod", "−0.80R", false],
          ].map(([name, r, win]) => (
            <div
              key={name as string}
              className="flex items-center justify-between rounded-md border border-white/6 bg-white/[.02] px-2 py-1.5"
            >
              <span className="text-[9px] text-ink-mute">{name}</span>
              <span
                className={`text-[9px] font-semibold tabular-nums ${
                  win ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {r}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 inline-flex items-center gap-1 text-[7px] text-ink-faint">
          <i className="size-1.5 rounded-full bg-emerald-400" /> Verified from
          synced accounts
        </p>
      </>
    ),
  },
  {
    id: "profile",
    label: "Profile",
    title: "One page that shows the work",
    benefit:
      "Stats, achievements and posts on a profile other traders can actually follow.",
    icon: UserRound,
    render: () => (
      <>
        <div className="flex items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-[9px] font-semibold text-ink-strong">
            AK
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold text-ink-strong">
              Ali Khaydarov
            </p>
            <p className="text-[8px] text-ink-faint">@alikhaydarov</p>
          </div>
        </div>
        <div className="mt-2 flex gap-3 text-[8px]">
          {[
            ["Followers", "412"],
            ["Following", "128"],
            ["Posts", "36"],
          ].map(([k, v]) => (
            <span key={k} className="text-ink-faint">
              <b className="text-ink-strong">{v}</b> {k}
            </span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1">
          {[
            ["Trades", "148"],
            ["Win", "68%"],
            ["P&L", "+$12.8K"],
            ["Avg R", "1.35R"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md border border-white/6 px-1.5 py-1">
              <p className="text-[7px] uppercase tracking-wider text-ink-faint">{k}</p>
              <p className="text-[9px] font-semibold text-ink-strong">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5">
          {["Verified", "30-day streak", "Top 8%"].map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-white/8 bg-white/[.03] px-1.5 py-0.5 text-[7px] text-ink-mute"
            >
              {badge}
            </span>
          ))}
        </div>
      </>
    ),
  },
];

const ROTATE_MS = 4200;

/**
 * A depth-stacked tour of the product's real screens.
 *
 * Built from CSS 3D transforms rather than a WebGL library: the whole thing is
 * transform and opacity, so it composites on the GPU and costs no bundle. The
 * panels are drawn from the app's own tokens rather than screenshots, so they
 * cannot drift out of date as the product changes.
 *
 * It advances on its own, pauses while the pointer is over it, and stops
 * entirely for anyone who has asked for reduced motion - where it degrades to
 * a plain, readable stack.
 */
export function LandingShowcase3D() {
  const [active, setActive] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  // Keyed on `active` as well, so picking a screen by hand restarts the clock
  // instead of being yanked away a moment later by a timer already in flight.
  useEffect(() => {
    if (paused || reduced) return;
    const timer = window.setTimeout(
      () => setActive((current) => (current + 1) % SCREENS.length),
      ROTATE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [active, paused, reduced]);

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return;
    const px = (event.clientX - box.left) / box.width - 0.5;
    const py = (event.clientY - box.top) / box.height - 0.5;
    setTilt({ x: -py * 10, y: px * 14 });
  };

  const current = SCREENS[active];

  return (
    <section
      className="auth3-showcase relative z-[1] mx-auto w-[min(1180px,calc(100%-48px))] py-[110px] [contain-intrinsic-size:1px_760px] [content-visibility:auto] max-sm:w-[min(calc(100%-30px),1180px)] max-sm:py-20"
      aria-labelledby="showcase-heading"
    >
      <div className="auth3-section-title" data-reveal>
        <span>INSIDE THE WORKSPACE</span>
        <h2 id="showcase-heading">
          Every screen you use.
          <br />
          One honest picture of your trading.
        </h2>
      </div>

      <div className="mt-10 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,.86fr)]">
        <div
          ref={stageRef}
          onPointerMove={onPointerMove}
          onPointerLeave={() => {
            setTilt({ x: 0, y: 0 });
            setPaused(false);
          }}
          onPointerEnter={() => setPaused(true)}
          className="relative mx-auto h-[356px] w-full max-w-[460px] [perspective:1400px] sm:h-[346px]"
        >
          <div
            className="relative h-full w-full transition-transform duration-500 ease-out [transform-style:preserve-3d]"
            style={{
              transform: reduced
                ? undefined
                : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            }}
          >
            {SCREENS.map((screen, index) => {
              const offset =
                (index - active + SCREENS.length) % SCREENS.length;
              const depth = offset * -110;
              const lift = offset * 30;
              const scale = 1 - offset * 0.06;
              return (
                <article
                  key={screen.id}
                  aria-hidden={offset !== 0}
                  className="absolute inset-x-0 top-0 mx-auto flex h-[256px] w-[86%] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,.9)] transition-all duration-700 ease-out sm:h-[246px]"
                  style={{
                    transform: reduced
                      ? `translateY(${offset * 14}px)`
                      : `translate3d(0, ${lift}px, ${depth}px) scale(${scale})`,
                    opacity: offset > 2 ? 0 : 1 - offset * 0.22,
                    zIndex: SCREENS.length - offset,
                    pointerEvents: offset === 0 ? "auto" : "none",
                  }}
                >
                  <header className="mb-2.5 flex items-center gap-2 border-b border-white/8 pb-2">
                    <screen.icon size={13} className="text-ink-mute" />
                    <span className="text-[10px] font-semibold tracking-tight text-ink-soft">
                      {screen.label}
                    </span>
                    <span className="ml-auto flex gap-1" aria-hidden="true">
                      <i className="size-1.5 rounded-full bg-white/15" />
                      <i className="size-1.5 rounded-full bg-white/15" />
                      <i className="size-1.5 rounded-full bg-white/15" />
                    </span>
                  </header>
                  <div className="flex flex-1 flex-col">
                    {screen.render()}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div data-reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-ink-faint">
            {current.label}
          </p>
          <h3 className="mt-2 text-[clamp(24px,3.2vw,34px)] font-bold leading-tight tracking-[-0.03em] text-white">
            {current.title}
          </h3>
          <p className="mt-3 max-w-md text-sm leading-6 text-ink-mute">
            {current.benefit}
          </p>

          <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Workspace screens">
            {SCREENS.map((screen, index) => (
              <button
                key={screen.id}
                type="button"
                role="tab"
                aria-selected={index === active}
                onClick={() => setActive(index)}
                className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  index === active
                    ? "border-white/25 bg-white/10 text-white"
                    : "border-white/10 text-ink-mute hover:border-white/20 hover:text-ink-soft"
                }`}
              >
                {screen.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
