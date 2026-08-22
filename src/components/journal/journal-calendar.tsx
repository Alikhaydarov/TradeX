"use client";

import { CalendarWorkspaceV3 } from "../calendar-workspace-v3";

const CALENDAR_TAILWIND_CONTRACT = [
  "contents",
  "[&_.mx-auto.max-w-\[1420px\]]:box-border [&_.mx-auto.max-w-\[1420px\]]:w-full [&_.mx-auto.max-w-\[1420px\]]:max-w-full [&_.mx-auto.max-w-\[1420px\]]:mx-0",
  "2xl:[&_.mx-auto.max-w-\[1420px\]]:!mx-auto 2xl:[&_.mx-auto.max-w-\[1420px\]]:!max-w-[1480px]",
].join(" ");

export function JournalCalendar() {
  return (
    <div className={CALENDAR_TAILWIND_CONTRACT}>
      <CalendarWorkspaceV3 />
    </div>
  );
}
