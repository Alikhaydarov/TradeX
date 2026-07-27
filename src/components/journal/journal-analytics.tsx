"use client";

import { JournalWorkspace } from "./journal-workspace";
import { openJournalLogin } from "./journal-auth";

export function JournalAnalytics() {
  return (
    <JournalWorkspace
      onLogin={openJournalLogin}
      mode="workspace"
      forcedTab="analytics"
    />
  );
}
