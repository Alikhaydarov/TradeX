"use client";

import { ProductModal } from "./product-modal";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  ChevronDown,
  LoaderCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { summarizeTrades } from "@/lib/journal-metrics";

type Account = {
  id: string;
  name: string;
  firm: string;
  account_size: number;
  status: string;
  market_type: string;
};
type Trade = {
  id: string;
  prop_account_id: string | null;
  account_name: string;
  symbol: string;
  side: "Long" | "Short";
  entry_price: number;
  exit_price: number;
  quantity: number;
  fees: number;
  pnl: number;
  note: string;
  traded_at: string;
  result_r: number;
};

async function api<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.error || "Could not complete the request.");
  return payload as T;
}

const currency = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));

function MobileTrade({
  trade,
  onDelete,
}: {
  trade: Trade;
  onDelete: () => void;
}) {
  return (
    <details className="mobile-trade-entry">
      <summary>
        <span
          className={
            "mobile-trade-direction " +
            (trade.side === "Long" ? "text-profit" : "text-loss")
          }
        >
          <ArrowUpRight size={19} />
        </span>
        <span className="mobile-trade-identity">
          <strong>
            {trade.symbol}
            <small
              className={trade.side === "Long" ? "text-profit" : "text-loss"}
            >
              {trade.side}
            </small>
          </strong>
          <time>{dateLabel(trade.traded_at)}</time>
        </span>
        <strong
          className={Number(trade.pnl) >= 0 ? "text-profit" : "text-loss"}
        >
          {currency.format(Number(trade.pnl))}
        </strong>
        <ChevronDown size={15} />
      </summary>
      <div className="mobile-trade-detail">
        <p>{trade.account_name}</p>
        <dl>
          {[
            ["Entry", Number(trade.entry_price).toLocaleString()],
            ["Exit", Number(trade.exit_price).toLocaleString()],
            ["Size", Number(trade.quantity).toLocaleString()],
            ["Fees", currency.format(Number(trade.fees))],
            [
              "Return",
              trade.result_r === null
                ? "—"
                : Number(trade.result_r).toFixed(2) + "R",
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {trade.note && <p className="mobile-trade-note">{trade.note}</p>}
        <button type="button" onClick={onDelete}>
          <Trash2 size={14} />
          Delete trade
        </button>
      </div>
    </details>
  );
}

export function TradeJournal({
  selectedAccountId,
}: {
  selectedAccountId: string | null;
}) {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(() => searchParams.get("symbol") || "");
  const [accountFilter, setAccountFilter] = useState(
    () => searchParams.get("account") || selectedAccountId || "all",
  );
  const [dateFilter, setDateFilter] = useState(
    () => searchParams.get("date") || "",
  );
  const [formOpen, setFormOpen] = useState(
    () => searchParams.get("add") === "1",
  );

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api<{ accounts: Account[]; trades: Trade[] }>(
        "/api/trades",
      );
      setAccounts(data.accounts);
      setTrades(data.trades);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Journal could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setAccountFilter(searchParams.get("account") || selectedAccountId || "all");
  }, [selectedAccountId, searchParams]);

  const shown = useMemo(
    () =>
      trades.filter(
        (trade) =>
          (accountFilter === "all" ||
            trade.prop_account_id === accountFilter) &&
          (!dateFilter || trade.traded_at.slice(0, 10) === dateFilter) &&
          `${trade.symbol} ${trade.side} ${trade.account_name}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [trades, accountFilter, dateFilter, query],
  );
  const summary = useMemo(() => {
    const result = summarizeTrades(
      shown.map((trade) => ({
        pnl: trade.pnl === null ? null : Number(trade.pnl),
        result_r: trade.result_r === null ? null : Number(trade.result_r),
      })),
    );
    return {
      pnl: result.pnl,
      wins: result.wins,
      winRate: Math.round(result.winRate),
      avgR: result.averageR,
    };
  }, [shown]);

  async function saveTrade(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const result = await api<{ trade: Trade }>("/api/trades", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setTrades((current) => [result.trade, ...current]);
      setFormOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Trade could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteTrade(id: string) {
    if (!window.confirm("Delete this trade from your journal?")) return;
    try {
      await api(`/api/trades/${id}`, { method: "DELETE" });
      setTrades((current) => current.filter((trade) => trade.id !== id));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Trade could not be deleted.",
      );
    }
  }

  return (
    <div className="trade-journal">
      <header className="trade-journal-header">
        <div>
          <p className="section-label">REVIEW YOUR EXECUTION</p>
          <h1>Trade journal</h1>
          <p>One clear record for every decision, outcome and lesson.</p>
        </div>
        <button
          type="button"
          className="trade-add-button"
          onClick={() => setFormOpen(true)}
        >
          <Plus size={16} /> Add trade
        </button>
      </header>
      {error && (
        <div className="trade-error" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}
      <section className="trade-summary" aria-label="Journal summary">
        <article>
          <span>Net P&amp;L</span>
          <strong className={summary.pnl >= 0 ? "positive" : "negative"}>
            {currency.format(summary.pnl)}
          </strong>
          <small>Filtered trades</small>
        </article>
        <article>
          <span>Win rate</span>
          <strong>{summary.winRate}%</strong>
          <small>{summary.wins} winning trades</small>
        </article>
        <article>
          <span>Trades logged</span>
          <strong>{shown.length}</strong>
          <small>{accounts.length} accounts</small>
        </article>
        <article>
          <span>Average R</span>
          <strong>{summary.avgR.toFixed(2)}R</strong>
          <small>Risk weighted result</small>
        </article>
      </section>
      <section className="trade-table-panel">
        <div className="trade-table-tools">
          <div>
            <h2>
              {dateFilter ? `Trades · ${dateLabel(dateFilter)}` : "All trades"}
            </h2>
            <p>Your latest 250 journal entries</p>
          </div>
          <div className="trade-filters">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search trades"
              placeholder="Search symbol"
            />
            <select
              value={accountFilter}
              onChange={(event) => setAccountFilter(event.target.value)}
              aria-label="Filter by account"
            >
              <option value="all">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            {dateFilter && (
              <button
                type="button"
                className="trade-clear-filter"
                onClick={() => setDateFilter("")}
              >
                Clear date
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <div className="trade-loading">
            <LoaderCircle className="animate-spin" size={18} /> Loading journal
          </div>
        ) : shown.length ? (
          <>
            <div className="trade-mobile-list">
              {shown.map((trade) => (
                <MobileTrade
                  key={trade.id}
                  trade={trade}
                  onDelete={() => void deleteTrade(trade.id)}
                />
              ))}
            </div>
            <div className="trade-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Instrument</th>
                    <th>Side</th>
                    <th>Account</th>
                    <th>Date</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>Size</th>
                    <th>Result</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((trade) => (
                    <tr key={trade.id}>
                      <td>
                        <strong>{trade.symbol}</strong>
                        {trade.note && <small>{trade.note}</small>}
                      </td>
                      <td>
                        <span
                          className={`trade-side ${trade.side === "Long" ? "long" : "short"}`}
                        >
                          {trade.side}
                        </span>
                      </td>
                      <td>{trade.account_name}</td>
                      <td>{dateLabel(trade.traded_at)}</td>
                      <td>{Number(trade.entry_price).toLocaleString()}</td>
                      <td>{Number(trade.exit_price).toLocaleString()}</td>
                      <td>{Number(trade.quantity).toLocaleString()}</td>
                      <td
                        className={
                          Number(trade.pnl) >= 0 ? "positive" : "negative"
                        }
                      >
                        {currency.format(Number(trade.pnl))}
                        <small>{Number(trade.result_r).toFixed(2)}R</small>
                      </td>
                      <td>
                        <button
                          className="trade-delete-button"
                          onClick={() => void deleteTrade(trade.id)}
                          aria-label={`Delete ${trade.symbol} trade`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="trade-empty">
            <span>
              <ArrowUpRight size={18} />
            </span>
            <h3>
              {trades.length
                ? "No trades match these filters"
                : "Your journal starts with one trade"}
            </h3>
            <p>
              {trades.length
                ? "Clear the search or choose another account."
                : "Log an execution to see your P&L, win rate and risk results here."}
            </p>
            {!trades.length && (
              <button
                onClick={() => setFormOpen(true)}
                className="trade-add-button"
              >
                <Plus size={15} /> Add your first trade
              </button>
            )}
          </div>
        )}
      </section>
      {formOpen && (
        <ProductModal
          titleId="trade-modal-title"
          busy={saving}
          onClose={() => setFormOpen(false)}
        >
          <section className="trade-modal" aria-labelledby="trade-modal-title">
            <header>
              <div>
                <h2 id="trade-modal-title">Add trade</h2>
                <p>
                  Record the execution. P&amp;L is calculated from your prices
                  and size.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                disabled={saving}
                onClick={() => setFormOpen(false)}
              >
                <X size={17} />
              </button>
            </header>
            <form onSubmit={saveTrade}>
              <label>
                Instrument
                <input
                  name="symbol"
                  required
                  minLength={2}
                  maxLength={20}
                  placeholder="EURUSD"
                  autoFocus
                />
              </label>
              <label>
                Account
                <select
                  name="accountId"
                  defaultValue={accountFilter === "all" ? "" : accountFilter}
                >
                  <option value="">Main account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Side
                <select name="side" required>
                  <option value="Long">Long</option>
                  <option value="Short">Short</option>
                </select>
              </label>
              <label>
                Trade date
                <input
                  name="tradedAt"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </label>
              <label>
                Entry price
                <input
                  name="entryPrice"
                  type="number"
                  min="0.00000001"
                  step="any"
                  required
                  placeholder="1.0850"
                />
              </label>
              <label>
                Exit price
                <input
                  name="exitPrice"
                  type="number"
                  min="0.00000001"
                  step="any"
                  required
                  placeholder="1.0875"
                />
              </label>
              <label>
                Size
                <input
                  name="quantity"
                  type="number"
                  min="0.00000001"
                  step="any"
                  required
                  defaultValue="1"
                />
              </label>
              <label>
                Fees
                <input
                  name="fees"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue="0"
                />
              </label>
              <label>
                Risk amount (optional)
                <input
                  name="riskAmount"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue="0"
                />
              </label>
              <label className="trade-note-field">
                Note
                <textarea
                  name="note"
                  maxLength={2000}
                  rows={3}
                  placeholder="What did you notice?"
                />
              </label>
              <footer>
                <button
                  type="button"
                  className="trade-cancel"
                  disabled={saving}
                  onClick={() => setFormOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="trade-add-button"
                  disabled={saving}
                >
                  {saving && (
                    <LoaderCircle className="animate-spin" size={15} />
                  )}{" "}
                  Save trade
                </button>
              </footer>
            </form>
          </section>
        </ProductModal>
      )}
    </div>
  );
}
