import type { JournalEntry } from "@/components/types";

/**
 * Shape journal_entries rows come back in, plus the row -> JournalEntry mapper.
 *
 * Lifted out of the client hook so the server bootstrap can map rows the same
 * way. Keeping two copies is how the two sides drift.
 */
export type JournalEntryRow = {
  id: string;
  prop_account_id?: string | null;
  symbol: string;
  side: "Long" | "Short";
  entry_price: string;
  exit_price: string;
  quantity: string;
  fees: string;
  pnl: string;
  note: string;
  traded_at: string;
  account_name?: string;
  market_type?: string;
  setup?: string;
  emotion?: string;
  risk_amount?: string;
  result_r?: string;
  risk_percent?: string;
  session?: string;
  following_plan?: boolean;
  error_made?: boolean;
  mistake_type?: string;
  review_completed?: boolean;
  to_trading_bible?: boolean;
  image_url?: string | null;
  tags?: string[];
};

function parseTradeImages(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is string => typeof item === "string")
          .slice(0, 3)
      : [value];
  } catch {
    return [value];
  }
}

export function journalEntryFromRow(entry: JournalEntryRow): JournalEntry {
  const imageUrls = parseTradeImages(entry.image_url);
  return {
    id: entry.id,
    propAccountId: entry.prop_account_id,
    symbol: entry.symbol,
    side: entry.side,
    entry: Number(entry.entry_price),
    exit: Number(entry.exit_price),
    quantity: Number(entry.quantity),
    fees: Number(entry.fees),
    pnl: Number(entry.pnl),
    note: entry.note,
    rawDate: entry.traded_at,
    date: new Date(`${entry.traded_at}T00:00:00`).toLocaleDateString("uz-UZ"),
    accountName: entry.account_name,
    marketType: entry.market_type,
    setup: entry.setup || "",
    emotion: entry.emotion || "Neutral",
    riskAmount: Number(entry.risk_amount || 0),
    resultR: Number(entry.result_r || 0),
    riskPercent: entry.risk_percent || "1.0%",
    session: entry.session || "",
    followingPlan: entry.following_plan ?? true,
    errorMade: entry.error_made ?? false,
    mistakeType: entry.mistake_type || "",
    reviewCompleted: entry.review_completed ?? false,
    toTradingBible: entry.to_trading_bible ?? false,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    tags: entry.tags || [],
  };
}
