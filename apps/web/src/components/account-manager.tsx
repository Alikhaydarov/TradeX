"use client";

import { ProductModal } from "./product-modal";
import { Money } from "./pnl-preferences";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { clientApi } from "@/lib/client-api";
import { DataLoader } from "./data-loader";
import {
  Activity,
  ArrowUpRight,
  Settings2,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

type Account = {
  id: string;
  name: string;
  firm: string;
  phase: string;
  market_type: string;
  account_size: number;
  initial_balance: number;
  profit_target: number;
  max_drawdown: number;
  daily_drawdown: number;
  status: string;
  account_type: string | null;
  platform: string | null;
  import_source: string | null;
  pnl: number;
  trades: number;
};
async function api<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload as T;
}
const money = (value: number) => <Money value={value} balance />;

export function AccountManager({
  initialAccounts,
  paid = false,
}: {
  initialAccounts?: Account[];
  paid?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["accounts"],
    queryFn: ({ signal }) =>
      clientApi<{ accounts: Account[] }>("/api/accounts", { signal }),
    initialData: initialAccounts ? { accounts: initialAccounts } : undefined,
    staleTime: 30_000,
  });
  const accounts = query.data?.accounts;
  const [deleting, setDeleting] = useState<string | null>(null);
  const writeLock = useRef(false);
  function setAccounts(update: (current: Account[]) => Account[]) {
    queryClient.setQueryData<{ accounts: Account[] }>(
      ["accounts"],
      (current) => ({ accounts: update(current?.accounts ?? []) }),
    );
  }
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);
  const [platform, setPlatform] = useState("manual");
  const [error, setError] = useState("");
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writeLock.current) return;
    writeLock.current = true;
    setSaving(true);
    setError("");
    const fields = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    try {
      const result = await api<{ account: Account }>("/api/accounts", {
        method: "POST",
        body: JSON.stringify(fields),
      });
      setAccounts((current) => [
        { ...result.account, pnl: 0, trades: 0 },
        ...current,
      ]);
      void queryClient.invalidateQueries({
        queryKey: ["journal"],
        refetchType: "none",
      });
      setModal(false);
      document.cookie =
        "tradoxy_account=" +
        result.account.id +
        "; Path=/; Max-Age=31536000; SameSite=Lax";
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Account could not be created.",
      );
    } finally {
      writeLock.current = false;
      setSaving(false);
    }
  }

  async function remove(account: Account) {
    if (writeLock.current) return;
    if (
      !window.confirm(
        `Delete “${account.name}”? Existing trades will remain in your journal.`,
      )
    )
      return;
    writeLock.current = true;
    setDeleting(account.id);
    try {
      await api(`/api/accounts/${account.id}`, { method: "DELETE" });
      queryClient.removeQueries({ queryKey: ["journal", account.id] });
      void queryClient.invalidateQueries({
        queryKey: ["journal"],
        refetchType: "none",
      });
      setAccounts((current) =>
        current.filter((item) => item.id !== account.id),
      );
      if (
        document.cookie
          .split("; ")
          .some((entry) => entry === "tradoxy_account=" + account.id)
      )
        document.cookie = "tradoxy_account=; Path=/; Max-Age=0; SameSite=Lax";
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Account could not be deleted.",
      );
    } finally {
      writeLock.current = false;
      setDeleting(null);
    }
  }

  return (
    <div className="account-manager">
      <header className="account-manager-header">
        <div>
          <h1>Trading accounts</h1>
        </div>
        <button className="account-add-button" onClick={() => setModal(true)}>
          <Plus size={16} /> Add account
        </button>
      </header>
      {(error || query.error) && (
        <div role="alert" className="trade-error">
          {error || query.error?.message}
          {query.isError && (
            <button onClick={() => void query.refetch()}>Retry</button>
          )}
          {error && (
            <button aria-label="Dismiss" onClick={() => setError("")}>
              <X size={15} />
            </button>
          )}
        </div>
      )}
      <div className="account-list-heading">
        <div>
          <h2>Your accounts <span className="account-count">{accounts?.length ?? 0}</span></h2>
        </div>
        <button
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
          aria-label="Refresh accounts"
        >
          <RefreshCw
            size={15}
            className={query.isFetching && accounts ? "animate-spin" : ""}
          />
        </button>
      </div>
      {query.isPending ? (
        <DataLoader label="Loading accounts" />
      ) : accounts?.length ? (
        <div className="account-grid">
          {accounts.map((account) => (
            <article className="account-card" key={account.id}>
              <Link className="account-card-main" href="/dashboard" prefetch={false} onClick={() => { document.cookie = "tradoxy_account=" + account.id + "; Path=/; Max-Age=31536000; SameSite=Lax"; router.refresh(); }} aria-label={`Open ${account.name} dashboard`}>
              <header>
                <span className="account-card-icon">
                  {account.platform?.toLowerCase() === "mt5" ? <b>5</b> : <Activity size={17} />}
                </span>
                <div className="account-card-identity"><h3>{account.name}</h3><p className="account-firm">{account.firm || (account.account_type === "real" ? "Real account" : "Prop account")} · {account.platform && account.platform !== "manual" ? account.platform.toUpperCase() : account.market_type}</p></div>
                <span className="account-status-pill">{account.status}</span>
              </header>
              <div className="account-card-balance-row"><div><small>Balance</small><strong>{money(Number(account.initial_balance) + Number(account.pnl))}</strong></div><div className={account.pnl >= 0 ? "positive" : "negative"}><small>Net P&amp;L</small><b><Money value={Number(account.pnl)} basis={Number(account.initial_balance)} /></b></div></div>
              </Link>
              <footer><span>{account.trades} trades</span><div><Link href={`/accounts/${account.id}`} aria-label={`Settings for ${account.name}`} title="Account settings"><Settings2 size={16} /></Link><button disabled={deleting !== null} className="account-delete" onClick={() => void remove(account)} aria-label={`Delete ${account.name}`} title="Delete account"><Trash2 size={15} /></button><Link href="/dashboard" prefetch={false} onClick={() => { document.cookie = "tradoxy_account=" + account.id + "; Path=/; Max-Age=31536000; SameSite=Lax"; router.refresh(); }} aria-label={`Open ${account.name} dashboard`} title="Open dashboard"><ArrowUpRight size={16} /></Link></div></footer>
            </article>
          ))}
        </div>
      ) : query.isError ? null : (
        <div className="account-empty">
          <span>
            <WalletCards size={21} />
          </span>
          <h2>Add your first trading account</h2>
          <p>
            Set up a prop challenge or manual account. Trades you add will
            update its journal performance.
          </p>
          <button className="account-add-button" onClick={() => setModal(true)}>
            <Plus size={15} /> Create account
          </button>
        </div>
      )}
      {modal && (
        <ProductModal
          titleId="account-modal-title"
          busy={saving}
          onClose={() => setModal(false)}
        >
          <section
            className="trade-modal"
            aria-labelledby="account-modal-title"
          >
            <header>
              <div>
                <h2 id="account-modal-title">Add trading account</h2>
                <p>
                  Account limits are used for context; your journal stays under
                  your control.
                </p>
              </div>
              <button
                aria-label="Close dialog"
                disabled={saving}
                onClick={() => setModal(false)}
              >
                <X size={17} />
              </button>
            </header>
            <form onSubmit={create}>
              <label>Connection
                <select name="platform" value={platform} onChange={(event) => setPlatform(event.target.value)}>
                  <option value="manual">Manual journal</option><option value="mt5">MetaTrader 5 · auto sync</option><option value="tradovate">Tradovate · CSV</option><option value="ninjatrader">NinjaTrader · CSV</option><option value="projectx">Project X · CSV</option><option value="ctrader">cTrader · CSV</option><option value="matchtrader">MatchTrader · CSV</option>
                </select>
              </label>
              {platform !== "manual" && <p className="account-connection-hint">{paid ? `Set up ${platform === "mt5" ? "MT5 sync" : "CSV import"} in account settings after creating this account.` : "Platform connections require Standard or Pro. Manual journaling is free."}</p>}
              <label>Account category<select name="accountType"><option value="prop">Prop challenge</option><option value="real">Real account</option></select></label>
              <label className="trade-note-field">
                Account name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="My 50K Challenge"
                  autoFocus
                />
              </label>
              <label>
                Firm or broker
                <input name="firm" maxLength={80} placeholder="Optional" />
              </label>
              <label>
                Account type
                <select name="marketType">
                  <option>CFD</option>
                  <option>Forex</option>
                  <option>Futures</option>
                  <option>Crypto</option>
                </select>
              </label>
              <label>
                Initial balance
                <input
                  name="initialBalance"
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  placeholder="50000"
                />
              </label>
              <label>
                Account size
                <input
                  name="accountSize"
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  placeholder="50000"
                />
              </label>
              <label>
                Profit target
                <input
                  name="profitTarget"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue="0"
                />
              </label>
              <label>
                Max drawdown
                <input
                  name="maxDrawdown"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue="0"
                />
              </label>
              <label>
                Daily drawdown
                <input
                  name="dailyDrawdown"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue="0"
                />
              </label>
              <footer>
                <button
                  type="button"
                  className="trade-cancel"
                  disabled={saving || (platform !== "manual" && !paid)}
                  onClick={() => setModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="account-add-button"
                  disabled={saving}
                >
                  {saving && (
                    <LoaderCircle className="animate-spin" size={15} />
                  )}
                  Save account
                </button>
              </footer>
            </form>
          </section>
        </ProductModal>
      )}
    </div>
  );
}
