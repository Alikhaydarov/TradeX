"use client";

import { JournalWorkspace } from "./journal-workspace";
import { openJournalLogin } from "./journal-auth";

export function JournalAccounts() {
  return <JournalWorkspace onLogin={openJournalLogin} mode="accounts" />;
}
