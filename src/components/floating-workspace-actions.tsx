"use client";

import { FloatingAddTradeButton } from "./floating-add-trade-button";
import { ProAiCoachRouteLauncher } from "./pro-ai-coach-route-launcher";

export function FloatingWorkspaceActions() {
  return (
    <div className="[&_button[aria-label$=AI]]:grid [&_button[aria-label$=AI]]:size-[3.1rem] [&_button[aria-label$=AI]]:min-w-[3.1rem] [&_button[aria-label$=AI]]:place-items-center [&_button[aria-label$=AI]]:gap-0 [&_button[aria-label$=AI]]:overflow-hidden [&_button[aria-label$=AI]]:rounded-full [&_button[aria-label$=AI]]:border-white/[.13] [&_button[aria-label$=AI]]:bg-[#0b0b0b] [&_button[aria-label$=AI]]:p-0 [&_button[aria-label$=AI]]:text-[0px] [&_button[aria-label$=AI]]:leading-none [&_button[aria-label$=AI]]:shadow-[0_14px_36px_rgba(0,0,0,.56)] [&_button[aria-label$=AI]_svg]:size-[1.15rem] [&_button[aria-label$=AI]_svg]:text-zinc-100 lg:[&_button[aria-label$=AI]]:bottom-[5.85rem] lg:[&_button[aria-label$=AI]]:right-[1.98rem]">
      <FloatingAddTradeButton />
      <ProAiCoachRouteLauncher />
    </div>
  );
}
