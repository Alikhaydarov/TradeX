"use client";

import { FloatingAddTradeButton } from "./floating-add-trade-button";
import { ProAiCoachRouteLauncher } from "./pro-ai-coach-route-launcher";

export function FloatingWorkspaceActions() {
  return (
    <div className="[&_button[aria-label$=AI]]:bottom-[5.75rem] [&_button[aria-label$=AI]]:right-4 [&_button[aria-label$=AI]]:grid [&_button[aria-label$=AI]]:size-[3.25rem] [&_button[aria-label$=AI]]:min-w-[3.25rem] [&_button[aria-label$=AI]]:place-items-center [&_button[aria-label$=AI]]:gap-0 [&_button[aria-label$=AI]]:overflow-visible [&_button[aria-label$=AI]]:rounded-full [&_button[aria-label$=AI]]:border-white/16 [&_button[aria-label$=AI]]:bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.12),transparent_32%),linear-gradient(145deg,rgba(24,24,27,0.98),rgba(5,5,5,0.98))] [&_button[aria-label$=AI]]:p-0 [&_button[aria-label$=AI]]:text-[0px] [&_button[aria-label$=AI]]:leading-none [&_button[aria-label$=AI]]:text-zinc-100 [&_button[aria-label$=AI]]:shadow-[0_16px_42px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.08)] [&_button[aria-label$=AI]]:backdrop-blur-xl [&_button[aria-label$=AI]]:transition [&_button[aria-label$=AI]]:duration-200 hover:[&_button[aria-label$=AI]]:-translate-y-0.5 hover:[&_button[aria-label$=AI]]:scale-[1.04] hover:[&_button[aria-label$=AI]]:border-white/30 hover:[&_button[aria-label$=AI]]:brightness-110 active:[&_button[aria-label$=AI]]:scale-95 [&_button[aria-label$=AI]_svg]:size-[1.15rem] [&_button[aria-label$=AI]_svg]:text-zinc-200 lg:[&_button[aria-label$=AI]]:bottom-[6.35rem] lg:[&_button[aria-label$=AI]]:right-8">
      <FloatingAddTradeButton />
      <ProAiCoachRouteLauncher />
    </div>
  );
}
