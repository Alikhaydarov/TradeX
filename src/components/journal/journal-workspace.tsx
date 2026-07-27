"use client";

import type { ComponentProps } from "react";

import { Journal as LegacyJournal } from "../journal";

export type JournalWorkspaceProps = ComponentProps<typeof LegacyJournal>;

const JOURNAL_TAILWIND_CONTRACT = [
  "contents",
  "[&_.animate-page-in.mx-auto]:box-border [&_.animate-page-in.mx-auto]:w-full [&_.animate-page-in.mx-auto]:max-w-full [&_.animate-page-in.mx-auto]:mx-0",
  "lg:[&_.animate-page-in.mx-auto]:!mx-auto lg:[&_.animate-page-in.mx-auto]:!w-[min(1320px,calc(100%-11rem))] lg:[&_.animate-page-in.mx-auto]:!max-w-[1320px] lg:[&_.animate-page-in.mx-auto]:!px-0",
  "[&_.animate-page-in>div.space-y-3>div[class*='grid'][class*='grid-cols-2'][class*='xl:grid-cols-5']]:hidden",
].join(" ");

export function JournalWorkspace(props: JournalWorkspaceProps) {
  return (
    <div className={JOURNAL_TAILWIND_CONTRACT}>
      <LegacyJournal {...props} />
    </div>
  );
}
