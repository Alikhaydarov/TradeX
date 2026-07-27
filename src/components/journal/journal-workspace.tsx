"use client";

import type { ComponentProps } from "react";

import { Journal as LegacyJournal } from "../journal";

export type JournalWorkspaceProps = ComponentProps<typeof LegacyJournal>;

export function JournalWorkspace(props: JournalWorkspaceProps) {
  return <LegacyJournal {...props} />;
}
