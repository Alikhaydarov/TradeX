"use client";

import { JournalWorkspace } from "./journal-workspace";
import { openJournalLogin } from "./journal-auth";

export function JournalTradeList() {
  return (
    <JournalWorkspace
      onLogin={openJournalLogin}
      mode="workspace"
      forcedTab="trades"
    />
  );
}
