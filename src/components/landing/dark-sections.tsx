"use client";

import Image from "next/image";
import { Link2, LineChart, Share2, ShieldCheck } from "lucide-react";

import { TradoxyMark } from "../tradoxy-mark";
import { RevealWords } from "./reveal-words";
import { Scroll3D, Scroll3DStage } from "./scroll-3d";

const STEPS = [
  {
    icon: Link2,
    title: "Connect or start by hand",
    body: "Bring in an account from the platform you already trade, or keep a manual one. Manual accounts are free and need no card.",
  },
  {
    icon: LineChart,
    title: "Review the month",
    body: "Net P&L, win rate and profit factor, with a calendar that shows the streaks before they turn into a bad month.",
  },
  {
    icon: ShieldCheck,
    title: "Keep the reasoning",
    body: "The setup, the risk and the note you wrote at the time stay attached to the result, so a pattern is findable later.",
  },
  {
    icon: Share2,
    title: "Share what happened",
    body: "Post progress from a real synced account into a private community, or export a clean card for anywhere else.",
  },
];

/** The daily loop, as a bento grid around the mark. */
export function LandingBento() {
  return (
    <section
      id="how"
      className="mx-auto w-[min(1180px,calc(100%-48px))] py-32 max-sm:w-[min(calc(100%-30px),1180px)] max-sm:py-20"
      aria-label="How Tradoxy works"
    >
      <RevealWords
        as="h2"
        text="Everything around the trade. None of the noise."
        className="mx-auto max-w-2xl text-center text-[clamp(24px,3.4vw,40px)] font-light leading-[1.2] tracking-[-0.02em]"
      />

      <Scroll3DStage className="relative mt-14 grid gap-3 lg:grid-cols-3">
        {STEPS.slice(0, 2).map((step, index) => (
          <BentoCard key={step.title} step={step} index={index} />
        ))}

        <div className="row-span-2 grid place-items-center rounded-2xl border border-white/8 bg-[#0b0b0b] p-10 max-lg:order-last max-lg:py-14">
          <div className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white">
              <TradoxyMark className="size-7 text-black" />
            </span>
            <p className="mt-6 text-[15px] font-light text-white">Tradoxy</p>
            <p className="mt-2 text-[12px] leading-6 text-white/60">
              One workspace,
              <br />
              every account.
            </p>
          </div>
        </div>

        {STEPS.slice(2).map((step, index) => (
          <BentoCard key={step.title} step={step} index={index + 2} />
        ))}
      </Scroll3DStage>
    </section>
  );
}

function BentoCard({
  step,
  index,
}: {
  step: (typeof STEPS)[number];
  index: number;
}) {
  return (
    <Scroll3D
      as="article"
      delay={(index % 2) * 0.06}
      depth={170}
      rotate={9}
      lift={40}
      className="rounded-2xl border border-white/8 bg-[#0b0b0b] p-7 max-sm:p-6"
    >
      <div className="flex items-start justify-between">
        <step.icon size={19} className="text-white/50" />
        <span className="text-[11px] tabular-nums text-white/50">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <h3 className="mt-10 text-[17px] font-light tracking-[-0.01em] text-white">
        {step.title}
      </h3>
      <p className="mt-2.5 text-[13px] leading-6 text-white/45">{step.body}</p>
    </Scroll3D>
  );
}

const PLATFORMS = [
  { name: "Tradovate", logo: "/platforms/tradovate.png", note: "Futures" },
  { name: "cTrader", logo: "/platforms/ctrader.svg", note: "Forex & CFD" },
  { name: "MetaTrader 5", logo: "/platforms/metatrader5.png", note: "Multi-asset" },
  { name: "NinjaTrader", logo: "/platforms/ninjatrader.png", note: "Futures" },
  { name: "TradeLocker", logo: "/platforms/tradelocker.png", note: "Multi-asset" },
  { name: "Match-Trader", logo: "/platforms/matchtrader.png", note: "Forex & CFD" },
  { name: "ProjectX", logo: "/platforms/projectx.png", note: "Futures" },
];

export function LandingPlatforms() {
  return (
    <section
      className="mx-auto w-[min(1180px,calc(100%-48px))] pb-32 max-sm:w-[min(calc(100%-30px),1180px)] max-sm:pb-20"
      aria-label="Supported platforms"
    >
      <RevealWords
        as="h2"
        text="Supported platforms"
        className="text-center text-[clamp(24px,3vw,34px)] font-light tracking-[-0.02em]"
      />

      <Scroll3DStage className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PLATFORMS.map((platform, index) => (
          <Scroll3D
            key={platform.name}
            as="article"
            delay={(index % 4) * 0.05}
            depth={130}
            rotate={7}
            lift={32}
            className="grid place-items-center rounded-2xl border border-white/8 bg-[#0b0b0b] px-4 py-8 text-center"
          >
            <Image
              src={platform.logo}
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-lg bg-white/90 object-contain p-1"
            />
            <p className="mt-4 text-[13px] text-white">{platform.name}</p>
            <p className="mt-1 text-[11px] text-white/55">{platform.note}</p>
          </Scroll3D>
        ))}
      </Scroll3DStage>
    </section>
  );
}
