"use client";

import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { XSpinner } from "@/components/app-loader";
import { useAuth } from "@/components/auth-context";
import { InstrumentBadge } from "@/components/instrument-badge";
import { TradeShareComposer } from "@/components/trade-share-composer";
import type { JournalEntry } from "@/components/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/api-client";
import { parseTradeImages } from "@/lib/social-format";

type FeedTradeRow = {
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

function tradeFromRow(row: FeedTradeRow): JournalEntry {
  const imageUrls = parseTradeImages(row.image_url);
  return {
    id: row.id,
    propAccountId: row.prop_account_id,
    symbol: row.symbol,
    side: row.side,
    entry: Number(row.entry_price || 0),
    exit: Number(row.exit_price || 0),
    quantity: Number(row.quantity || 0),
    fees: Number(row.fees || 0),
    pnl: Number(row.pnl || 0),
    note: row.note || "",
    rawDate: row.traded_at,
    date: new Date(`${row.traded_at}T00:00:00`).toLocaleDateString("en-US"),
    accountName: row.account_name,
    marketType: row.market_type,
    setup: row.setup || "",
    emotion: row.emotion || "Neutral",
    riskAmount: Number(row.risk_amount || 0),
    resultR: Number(row.result_r || 0),
    riskPercent: row.risk_percent || "",
    session: row.session || "",
    followingPlan: row.following_plan ?? true,
    errorMade: row.error_made ?? false,
    mistakeType: row.mistake_type || "",
    reviewCompleted: row.review_completed ?? false,
    toTradingBible: row.to_trading_bible ?? false,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    tags: row.tags || [],
  };
}

export function PostComposer({
  onLogin,
  onPublished,
}: {
  onLogin: () => void;
  onPublished: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [trades, setTrades] = useState<JournalEntry[]>([]);
  const [target, setTarget] = useState<JournalEntry | null>(null);

  const loadTrades = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<{ entries: FeedTradeRow[] }>("/api/journal");
      setTrades(response.entries.map(tradeFromRow));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Trades could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const openPicker = useCallback(() => {
    if (!user) {
      onLogin();
      return;
    }
    setOpen(true);
    if (!trades.length) void loadTrades();
  }, [loadTrades, onLogin, trades.length, user]);

  useEffect(() => {
    window.addEventListener("tradeway:share-trade", openPicker);
    return () => window.removeEventListener("tradeway:share-trade", openPicker);
  }, [openPicker]);

  const accountOptions = useMemo(() => {
    const seen = new Set<string>();
    return trades.reduce<Array<{ id: string; label: string }>>((options, trade) => {
      const id = trade.propAccountId || "";
      if (!id || seen.has(id)) return options;
      seen.add(id);
      options.push({
        id,
        label: trade.accountName?.trim() || `${trade.marketType || "Trading"} account`,
      });
      return options;
    }, []);
  }, [trades]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const next = [...trades]
      .filter((trade) =>
        accountFilter === "all" ? true : trade.propAccountId === accountFilter,
      )
      .sort((left, right) =>
        String(right.rawDate || "").localeCompare(String(left.rawDate || "")),
      );
    if (!normalized) return next;
    return next.filter((trade) =>
      `${trade.symbol} ${trade.accountName || ""} ${trade.setup || ""} ${
        trade.session || ""
      } ${trade.note || ""}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [accountFilter, query, trades]);

  return (
    <>
      <section className="rounded-2xl border border-white/8 bg-[#090909] p-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Share a verified trade review</p>
            <p className="mt-1 text-xs text-zinc-600">
              Choose a journal entry and publish its execution context.
            </p>
          </div>
          <Button onClick={openPicker} className="shrink-0 bg-white text-black hover:bg-zinc-200">
            <Plus className="size-4" /> Share trade
          </Button>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88dvh] overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-white/8 px-4 py-4">
            <DialogTitle>Share trade</DialogTitle>
            <p className="text-sm text-zinc-500">Pick a closed journal entry.</p>
          </DialogHeader>
          <div className="space-y-3 border-b border-white/8 p-3">
            {accountOptions.length > 1 ? (
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {accountOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <label className="flex h-10 items-center gap-2 rounded-lg border border-white/8 bg-[#0b0b0b] px-3 focus-within:border-white/20">
              <Search className="size-4 text-zinc-600" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search trades"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-700"
              />
            </label>
          </div>

          <div className="max-h-[55dvh] overflow-y-auto p-2">
            {loading ? (
              <div className="grid min-h-48 place-items-center text-sm text-zinc-500">
                <span className="inline-flex items-center gap-2">
                  <XSpinner size="sm" /> Loading trades
                </span>
              </div>
            ) : filtered.length ? (
              <div className="space-y-1">
                {filtered.map((trade) => (
                  <button
                    key={trade.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setTarget(trade);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-white/[.045]"
                  >
                    <InstrumentBadge symbol={trade.symbol} compact className="shrink-0 bg-[#121212]" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                            trade.side === "Long"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-rose-400/10 text-rose-300"
                          }`}
                        >
                          {trade.side}
                        </span>
                        <span className="text-[10px] text-zinc-600">{trade.rawDate}</span>
                      </span>
                      <span className="mt-1 block truncate text-xs text-zinc-500">
                        {trade.setup || trade.session || trade.note || "No review note"}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 font-mono text-sm font-semibold ${
                        trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid min-h-48 place-items-center px-6 text-center">
                <div>
                  <p className="text-sm font-semibold text-white">No trades found</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    Add a closed journal entry before sharing it.
                  </p>
                  <Button
                    className="mt-4 bg-white text-black hover:bg-zinc-200"
                    onClick={() => {
                      setOpen(false);
                      router.push("/accounts");
                    }}
                  >
                    Open journal
                  </Button>
                </div>
              </div>
            )}
          </div>
          {error ? (
            <p className="border-t border-rose-500/20 bg-rose-500/8 px-4 py-3 text-xs text-rose-300">
              {error}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      <TradeShareComposer
        trade={target}
        onClose={() => {
          const published = Boolean(target);
          setTarget(null);
          if (published) onPublished();
        }}
      />
    </>
  );
}
