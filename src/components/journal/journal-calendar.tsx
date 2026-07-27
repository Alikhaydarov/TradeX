"use client";

import dynamic from "next/dynamic";

import { WorkspaceSectionSkeleton } from "../workspace-section-skeleton";

const CalendarWorkspaceV2 = dynamic(
  () =>
    import("../calendar-workspace-v2").then(
      (module) => module.CalendarWorkspaceV2,
    ),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

const CALENDAR_TAILWIND_CONTRACT = [
  "contents",
  "[&_.mx-auto.max-w-\[1420px\]]:box-border [&_.mx-auto.max-w-\[1420px\]]:w-full [&_.mx-auto.max-w-\[1420px\]]:max-w-full [&_.mx-auto.max-w-\[1420px\]]:mx-0",
  "lg:[&_.mx-auto.max-w-\[1420px\]]:!mx-auto lg:[&_.mx-auto.max-w-\[1420px\]]:!w-[min(1320px,calc(100%-11rem))] lg:[&_.mx-auto.max-w-\[1420px\]]:!max-w-[1320px] lg:[&_.mx-auto.max-w-\[1420px\]]:!px-0",
].join(" ");

export function JournalCalendar() {
  return (
    <div className={CALENDAR_TAILWIND_CONTRACT}>
      <CalendarWorkspaceV2 />
    </div>
  );
}
