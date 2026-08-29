"use client";

import type { ComponentProps } from "react";

import { JournalV2 as LegacyJournal } from "../journal-v2";

export type JournalWorkspaceProps = ComponentProps<typeof LegacyJournal>;

const JOURNAL_TAILWIND_CONTRACT = [
  "contents",
  "[&_.animate-page-in.mx-auto]:box-border [&_.animate-page-in.mx-auto]:w-full [&_.animate-page-in.mx-auto]:max-w-full [&_.animate-page-in.mx-auto]:mx-0",
  "lg:[&_.animate-page-in.mx-auto]:!mx-auto lg:[&_.animate-page-in.mx-auto]:!w-full lg:[&_.animate-page-in.mx-auto]:!max-w-[1540px] xl:[&_.animate-page-in.mx-auto]:!px-1",
  "[&_.animate-page-in>div.space-y-3>div[class*='grid'][class*='grid-cols-2'][class*='xl:grid-cols-5']]:hidden",
].join(" ");

export function JournalWorkspace(props: JournalWorkspaceProps) {
  return (
    <div className={JOURNAL_TAILWIND_CONTRACT}>
      <LegacyJournal {...props} />
    </div>
  );
}
