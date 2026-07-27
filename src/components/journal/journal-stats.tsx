"use client";

import { JournalWorkspace } from "./journal-workspace";
import { openJournalLogin } from "./journal-auth";

export function JournalStats() {
  return (
    <JournalWorkspace
      onLogin={openJournalLogin}
      mode="workspace"
      forcedTab="overview"
    />
  );
}
