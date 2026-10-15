"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, LoaderCircle, Plus, RefreshCw, Trash2, WalletCards, X } from "lucide-react";

type Account = { id: string; name: string; firm: string; phase: string; market_type: string; account_size: number; initial_balance: number; profit_target: number; max_drawdown: number; daily_drawdown: number; status: string; pnl: number; trades: number };
async function api<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload as T;
}
const money = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export function AccountManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState("");
  const portfolio = useMemo(() => accounts.reduce((total, account) => total + Number(account.initial_balance) + Number(account.pnl), 0), [accounts]);
  const load = useCallback(async () => {
    setError("");
    try { const result = await api<{ accounts: Account[] }>("/api/accounts"); setAccounts(result.accounts); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Accounts could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
    try { const result = await api<{ account: Account }>("/api/accounts", { method: "POST", body: JSON.stringify(fields) }); setAccounts((current) => [result.account, ...current]); setModal(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Account could not be created."); }
    finally { setSaving(false); }
  }

  async function remove(account: Account) {
    if (!window.confirm(`Delete “${account.name}”? Existing trades will remain in your journal.`)) return;
    try { await api(`/api/accounts/${account.id}`, { method: "DELETE" }); setAccounts((current) => current.filter((item) => item.id !== account.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Account could not be deleted."); }
  }

  return <div className="account-manager">
    <header className="account-manager-header"><div><p className="section-label">YOUR CAPITAL</p><h1>Trading accounts</h1><p>Keep prop challenges and personal accounts organized in one place.</p></div><button className="account-add-button" onClick={() => setModal(true)}><Plus size={16}/> Add account</button></header>
    {error && <div role="alert" className="trade-error">{error}<button aria-label="Dismiss" onClick={() => setError("")}><X size={15}/></button></div>}
    <section className="account-portfolio"><span><WalletCards size={17}/> Total tracked capital</span><strong>{money(portfolio)}</strong><small>{accounts.length} {accounts.length === 1 ? "account" : "accounts"} · starting balance plus journal results</small></section>
    <div className="account-list-heading"><div><h2>Your accounts</h2><p>Balances reflect the trades recorded in your journal.</p></div><button onClick={() => void load()} aria-label="Refresh accounts"><RefreshCw size={15}/></button></div>
    {loading ? <div className="account-list-loading"><LoaderCircle className="animate-spin" size={18}/>Loading accounts</div> : accounts.length ? <div className="account-grid">{accounts.map((account) => <article className="account-card" key={account.id}><header><span className="account-card-icon"><Activity size={17}/></span><span className="account-status-pill">{account.status}</span><button className="account-delete" onClick={() => void remove(account)} aria-label={`Delete ${account.name}`}><Trash2 size={15}/></button></header><h3>{account.name}</h3><p className="account-firm">{account.firm || "Personal account"} <span>·</span> {account.market_type}</p><strong className="account-card-balance">{money(Number(account.initial_balance) + Number(account.pnl))}</strong><div className="account-card-meta"><span><small>Starting balance</small>{money(Number(account.initial_balance))}</span><span><small>Journal P&amp;L</small><b className={account.pnl >= 0 ? "positive" : "negative"}>{money(Number(account.pnl))}</b></span><span><small>Trades</small>{account.trades}</span><span><small>Account size</small>{money(Number(account.account_size))}</span></div><footer><span>{account.phase}</span>{account.profit_target > 0 && <span>Target {money(Number(account.profit_target))}</span>}<Link href={`/trades?account=${account.id}`}>Open journal <span aria-hidden="true">→</span></Link></footer></article>)}</div> : <div className="account-empty"><span><WalletCards size={21}/></span><h2>Add your first trading account</h2><p>Set up a prop challenge or manual account. Trades you add will update its journal performance.</p><button className="account-add-button" onClick={() => setModal(true)}><Plus size={15}/> Create account</button></div>}
    {modal && <div className="trade-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModal(false); }}><section className="trade-modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title"><header><div><h2 id="account-modal-title">Add trading account</h2><p>Account limits are used for context; your journal stays under your control.</p></div><button aria-label="Close dialog" onClick={() => setModal(false)}><X size={17}/></button></header><form onSubmit={create}>
      <label className="trade-note-field">Account name<input name="name" required minLength={2} maxLength={80} placeholder="My 50K Challenge" autoFocus/></label>
      <label>Firm or broker<input name="firm" maxLength={80} placeholder="Optional"/></label>
      <label>Account type<select name="marketType"><option>CFD</option><option>Forex</option><option>Futures</option><option>Crypto</option></select></label>
      <label>Initial balance<input name="initialBalance" type="number" min="0.01" step="any" required placeholder="50000"/></label>
      <label>Account size<input name="accountSize" type="number" min="0.01" step="any" required placeholder="50000"/></label>
      <label>Profit target<input name="profitTarget" type="number" min="0" step="any" defaultValue="0"/></label>
      <label>Max drawdown<input name="maxDrawdown" type="number" min="0" step="any" defaultValue="0"/></label>
      <label>Daily drawdown<input name="dailyDrawdown" type="number" min="0" step="any" defaultValue="0"/></label>
      <footer><button type="button" className="trade-cancel" disabled={saving} onClick={() => setModal(false)}>Cancel</button><button type="submit" className="account-add-button" disabled={saving}>{saving && <LoaderCircle className="animate-spin" size={15}/>}Save account</button></footer>
    </form></section></div>}
  </div>;
}
