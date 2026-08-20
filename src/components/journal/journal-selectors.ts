import type { PropAccount } from "../types";
import type { StoredJournalEntry } from "./journal-data-store";

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function selectMonthEntries(
  entries: StoredJournalEntry[],
  month: Date,
) {
  const key = monthKey(month);
  return entries.filter((entry) => entry.rawDate.startsWith(key));
}

export function buildJournalStats(entries: StoredJournalEntry[]) {
  let pnl = 0;
  let grossWins = 0;
  let grossLosses = 0;
  let wins = 0;
  let losses = 0;
  let totalR = 0;

  for (const entry of entries) {
    pnl += entry.pnl;
    totalR += entry.resultR || 0;
    if (entry.pnl > 0) {
      wins += 1;
      grossWins += entry.pnl;
    } else if (entry.pnl < 0) {
      losses += 1;
      grossLosses += Math.abs(entry.pnl);
    }
  }

  const decided = wins + losses;
  return {
    pnl,
    wins,
    losses,
    rate: decided ? Math.round((wins / decided) * 100) : 0,
    r: entries.length ? totalR / entries.length : 0,
    pf: grossLosses ? grossWins / grossLosses : grossWins > 0 ? grossWins : 0,
  };
}

export function buildEquityCurve(
  account: PropAccount,
  entries: StoredJournalEntry[],
) {
  const sorted = [...entries].sort((left, right) =>
    left.rawDate.localeCompare(right.rawDate),
  );
  let equity = account.initialBalance;
  const points = [{ trade: 0, equity, label: "Start" }];

  sorted.forEach((entry, index) => {
    equity += entry.pnl;
    points.push({
      trade: index + 1,
      equity,
      label: entry.rawDate,
    });
  });

  return points;
}

export function buildSetupStats(entries: StoredJournalEntry[]) {
  const map = new Map<string, { pnl: number; trades: number; wins: number }>();
  for (const entry of entries) {
    const name = entry.setup || "Uncategorized";
    const current = map.get(name) ?? { pnl: 0, trades: 0, wins: 0 };
    current.pnl += entry.pnl;
    current.trades += 1;
    current.wins += entry.pnl > 0 ? 1 : 0;
    map.set(name, current);
  }

  return [...map.entries()]
    .map(([name, value]) => ({
      name,
      ...value,
      rate: value.trades
        ? Math.round((value.wins / value.trades) * 100)
        : 0,
    }))
    .sort((left, right) => right.pnl - left.pnl);
}

export function buildMistakeStats(entries: StoredJournalEntry[]) {
  const map = new Map<string, { pnl: number; trades: number }>();
  for (const entry of entries) {
    if (!entry.errorMade || !entry.mistakeType) continue;
    const current = map.get(entry.mistakeType) ?? { pnl: 0, trades: 0 };
    current.pnl += entry.pnl;
    current.trades += 1;
    map.set(entry.mistakeType, current);
  }

  return [...map.entries()]
    .map(([name, value]) => ({ name, ...value }))
    .sort((left, right) => left.pnl - right.pnl);
}

export function calculatePlanRate(entries: StoredJournalEntry[]) {
  if (!entries.length) return 0;
  let followed = 0;
  for (const entry of entries) {
    if (entry.followingPlan) followed += 1;
  }
  return Math.round((followed / entries.length) * 100);
}

export function buildWeeklyStrip(
  account: PropAccount,
  month: Date,
  entries: StoredJournalEntry[],
) {
  const now = new Date();
  const currentMonth =
    now.getFullYear() === month.getFullYear() &&
    now.getMonth() === month.getMonth();
  const anchor = currentMonth
    ? new Date(now)
    : new Date(month.getFullYear(), month.getMonth(), 1);
  anchor.setHours(0, 0, 0, 0);
  anchor.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));

  const entriesByDay = new Map<string, StoredJournalEntry[]>();
  for (const entry of entries) {
    const current = entriesByDay.get(entry.rawDate) ?? [];
    current.push(entry);
    entriesByDay.set(entry.rawDate, current);
  }

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(anchor);
    day.setDate(anchor.getDate() + index);
    const key = day.toISOString().slice(0, 10);
    const dayEntries = entriesByDay.get(key) ?? [];
    const pnl = dayEntries.reduce((sum, entry) => sum + entry.pnl, 0);
    return {
      key,
      label: day.toLocaleDateString("en-US", {
        weekday: "short",
        day: "2-digit",
      }),
      trades: dayEntries.length,
      pnl,
      percent: account.accountSize ? (pnl / account.accountSize) * 100 : 0,
    };
  });
}

export function sortTradesNewest(entries: StoredJournalEntry[]) {
  return [...entries].sort((left, right) =>
    right.rawDate.localeCompare(left.rawDate),
  );
}
