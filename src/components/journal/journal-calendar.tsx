"use client";

import { CalendarWorkspaceV2 } from "../calendar-workspace-v2";

const CALENDAR_TAILWIND_CONTRACT = [
  "contents",
  "[&_.mx-auto.max-w-\[1420px\]]:box-border [&_.mx-auto.max-w-\[1420px\]]:w-full [&_.mx-auto.max-w-\[1420px\]]:max-w-full [&_.mx-auto.max-w-\[1420px\]]:mx-0",
  "lg:[&_.mx-auto.max-w-\[1420px\]]:!mx-auto lg:[&_.mx-auto.max-w-\[1420px\]]:!w-[min(1320px,calc(100%-11rem))] lg:[&_.mx-auto.max-w-\[1420px\]]:!max-w-[1320px] lg:[&_.mx-auto.max-w-\[1420px\]]:!px-0",
  "[&_[data-slot='card']]:!border-xborder [&_[data-slot='card']]:!bg-xsurface [&_[data-slot='card']]:!shadow-[inset_0_1px_0_rgba(255,255,255,.025),0_18px_50px_rgba(0,0,0,.18)]",
  "[&_[data-slot='card-header']]:!border-xborder [&_[data-slot='card-header']]:!bg-xsurface",
  "[&_[data-slot='card-content']]:!bg-xsurface",
  "[&_[data-slot='select-trigger']]:!border-xborder [&_[data-slot='select-trigger']]:!bg-xpanel hover:[&_[data-slot='select-trigger']]:!border-xborder-strong hover:[&_[data-slot='select-trigger']]:!bg-xcard",
  "[&_[data-slot='dialog-content']]:!border-xborder-strong [&_[data-slot='dialog-content']]:!bg-xcard",
  "[&_[data-slot='dialog-header']]:!border-xborder",
  "[&_button[class*='border-white/8']]:!border-xborder [&_button[class*='border-white/8']]:!bg-xpanel",
  "[&_div[class*='border-white/8']]:!border-xborder",
  "[&_div[class*='bg-[#0a0a0a]']]:!bg-xsurface [&_div[class*='bg-[#101010]']]:!bg-xpanel",
  "[&_button[class*='bg-[#0a0a0a]']]:!bg-xsurface [&_button[class*='bg-[#101010]']]:!bg-xpanel",
  "[&_.recharts-tooltip-wrapper]:!z-30",
].join(" ");

export function JournalCalendar() {
  return (
    <div className={CALENDAR_TAILWIND_CONTRACT}>
      <CalendarWorkspaceV2 />
    </div>
  );
}
