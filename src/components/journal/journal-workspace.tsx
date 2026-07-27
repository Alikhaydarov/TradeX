"use client";

import type { ComponentProps } from "react";

import { Journal as LegacyJournal } from "../journal";

export type JournalWorkspaceProps = ComponentProps<typeof LegacyJournal>;

const HIDE_DUPLICATE_DASHBOARD_STATS =
  "contents [&_.animate-page-in>div.space-y-3>div[class*='grid'][class*='grid-cols-2'][class*='xl:grid-cols-5']]:hidden";

export function JournalWorkspace(props: JournalWorkspaceProps) {
  return (
    <div className={HIDE_DUPLICATE_DASHBOARD_STATS}>
      <LegacyJournal {...props} />
    </div>
  );
}
