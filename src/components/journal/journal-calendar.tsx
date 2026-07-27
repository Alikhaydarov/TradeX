"use client";

import dynamic from "next/dynamic";

import { WorkspaceSectionSkeleton } from "@/components/workspace-section-skeleton";

const CalendarWorkspace = dynamic(
  () =>
    import("@/components/calendar-workspace-v2").then(
      (module) => module.CalendarWorkspaceV2,
    ),
  {
    ssr: false,
    loading: () => <WorkspaceSectionSkeleton />,
  },
);

export function JournalCalendar() {
  return <CalendarWorkspace />;
}
