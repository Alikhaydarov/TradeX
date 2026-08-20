"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { JournalEntry } from "../types";

/**
 * Journal entries the server already resolved during the workspace bootstrap.
 *
 * Without this, every journal-backed route (dashboard, trades, analytics,
 * calendar) opened by mounting, discovering an empty cache, and only then
 * issuing `GET /api/journal` - so the skeleton stayed up for a full round-trip
 * that the server could have answered before the page was even sent.
 *
 * It is a context rather than a prop because the consumers sit behind
 * `next/dynamic` boundaries several levels down; threading a prop through them
 * would mean touching every route component for data none of them own.
 */
const JournalSeedContext = createContext<JournalEntry[] | null>(null);

export function JournalSeedProvider({
  entries,
  children,
}: {
  entries?: JournalEntry[];
  children: ReactNode;
}) {
  return (
    <JournalSeedContext.Provider value={entries ?? null}>
      {children}
    </JournalSeedContext.Provider>
  );
}

export function useJournalSeed() {
  return useContext(JournalSeedContext);
}
