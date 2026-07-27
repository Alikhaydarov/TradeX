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

export function JournalCalendar() {
  return <CalendarWorkspaceV2 />;
}
