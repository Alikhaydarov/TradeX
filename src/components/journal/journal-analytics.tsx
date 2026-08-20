"use client";

import { JournalWorkspace } from "./journal-workspace";
import { openJournalLogin } from "./journal-auth";

const ANALYTICS_WORKSPACE_CLASS = [
  "analytics-workspace contents",
  "[&_[data-slot='card']]:!border-xborder [&_[data-slot='card']]:!bg-xsurface [&_[data-slot='card']]:!shadow-[inset_0_1px_0_rgba(255,255,255,.025),0_18px_48px_rgba(0,0,0,.18)]",
  "[&_[data-slot='card-header']]:!border-xborder [&_[data-slot='card-header']]:!bg-xsurface",
  "[&_[data-slot='card-content']]:!bg-xsurface",
  "[&_[data-slot='tabs-list']]:!border [&_[data-slot='tabs-list']]:!border-xborder [&_[data-slot='tabs-list']]:!bg-xpanel [&_[data-slot='tabs-list']]:!p-1",
  "[&_[data-slot='tabs-trigger']]:!rounded-lg [&_[data-slot='tabs-trigger']]:!text-xmuted-strong data-[state=active]:[&_[data-slot='tabs-trigger']]:!bg-xraised data-[state=active]:[&_[data-slot='tabs-trigger']]:!text-white",
  "[&_[data-slot='select-trigger']]:!border-xborder [&_[data-slot='select-trigger']]:!bg-xpanel hover:[&_[data-slot='select-trigger']]:!border-xborder-strong hover:[&_[data-slot='select-trigger']]:!bg-xcard",
  "[&_div[class*='border-white/10']]:!border-xborder [&_div[class*='border-white/8']]:!border-xborder",
  "[&_div[class*='bg-[#171717]']]:!bg-xpanel [&_div[class*='bg-[#111111]']]:!bg-xpanel [&_div[class*='bg-[#0d0d0d]']]:!bg-xsurface",
  "[&_section[class*='bg-[#171717]']]:!bg-xpanel [&_section[class*='bg-[#111111]']]:!bg-xpanel [&_section[class*='bg-[#0d0d0d]']]:!bg-xsurface",
  "[&_table_thead]:!bg-xpanel [&_table_thead]:!text-xmuted [&_table_tbody_tr]:!border-xborder hover:[&_table_tbody_tr]:!bg-xpanel",
  "[&_.recharts-cartesian-grid_line]:!stroke-white/[.055] [&_.recharts-tooltip-wrapper]:!z-30",
].join(" ");

export function JournalAnalytics() {
  return (
    <div className={ANALYTICS_WORKSPACE_CLASS}>
      <JournalWorkspace
        onLogin={openJournalLogin}
        mode="workspace"
        forcedTab="analytics"
      />
    </div>
  );
}
