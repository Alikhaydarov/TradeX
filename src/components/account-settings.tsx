"use client";

import { CheckCircle2, Settings, ShieldCheck, SlidersHorizontal, WalletCards, Wifi } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useActiveAccountStore } from "./active-account-context";
import { CTraderSettings } from "./ctrader-settings";
import { Mt5Settings } from "./mt5-settings";
import { TradovateSettings } from "./tradovate-settings";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Spinner } from "./ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { PropAccount } from "./types";
import { useWorkspacePreferences } from "./workspace-preferences-context";

const cash = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function accountFrom(row: Record<string, unknown>): PropAccount {
  return {
    id: String(row.id),
    name: String(row.name || "Account"),
    accountType: row.account_type === "real" ? "real" : "prop",
    firm: String(row.firm || ""),
    propSite: String(row.prop_site || ""),
    propLogin: String(row.prop_login || ""),
    importSource: String(row.import_source || "manual") as PropAccount["importSource"],
    platform: String(row.platform || "mt5"),
    phase: String(row.phase || "Challenge"),
    marketType: String(row.market_type || "CFD"),
    accountSize: Number(row.account_size || 0),
    initialBalance: Number(row.initial_balance || row.account_size || 0),
    profitTarget: Number(row.profit_target || 0),
    maxDrawdown: Number(row.max_drawdown || 0),
    dailyDrawdown: Number(row.daily_drawdown || 0),
    startDate: String(row.start_date || new Date().toISOString().slice(0, 10)),
    status: String(row.status || "Active") as PropAccount["status"],
  };
}

function connectorLabel(account: PropAccount) {
  const platform = String(account.platform || "manual").toLowerCase();
  if (platform === "mt5" || account.importSource === "mt5_bridge") return "MT5 Auto Sync";
  if (platform === "tradovate" || account.importSource === "tradovate") return "Tradovate OAuth Sync";
  if (platform === "ninjatrader") return "NinjaTrader";
  if (platform === "ctrader" || account.importSource === "ctrader") return "cTrader Import";
  if (platform === "projectx") return "ProjectX";
  return "Manual journal";
}

export function AccountSettings({ onLogin: _onLogin }: { onLogin: () => void }) {
  void _onLogin;
  const { accounts, activeAccountId, setActiveAccount, setAccounts, refreshAccounts } = useActiveAccountStore();
  const { hidePersonalInfo } = useWorkspacePreferences();
  const account = useMemo(() => accounts.find((item) => item.id === activeAccountId) || null, [accounts, activeAccountId]);
  const [name, setName] = useState(account?.name || "");
  const [firm, setFirm] = useState(account?.firm || "");
  const [phase, setPhase] = useState(account?.phase || "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(account?.name || "");
    setFirm(account?.firm || "");
    setPhase(account?.phase || "");
  }, [account?.id, account?.name, account?.firm, account?.phase]);

  const saveProfile = async () => {
    if (!account) return;
    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 60) {
      setMessage("Account name must be between 2 and 60 characters.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const response = await apiRequest<{ account: Record<string, unknown> }>(`/api/prop-accounts/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: cleanName, firm: firm.trim().slice(0, 80), phase: phase.trim().slice(0, 40) }),
      });
      const updated = accountFrom(response.account);
      setAccounts(accounts.map((item) => item.id === updated.id ? updated : item));
      setMessage("Account settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Settings were not saved.");
    } finally {
      setSaving(false);
    }
  };

  if (!account) {
    return (
      <div className="mx-auto grid min-h-[70dvh] max-w-2xl place-items-center p-5 text-center">
        <div className="rounded-[1.7rem] border border-white/8 bg-[#0b0b0b] p-6">
          <WalletCards className="mx-auto text-zinc-400" size={34} />
          <h1 className="mt-4 text-2xl font-black text-white">Select an account first</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Settings are attached to one selected prop or real account.</p>
          <Button className="mt-5 bg-white text-black hover:bg-zinc-200" onClick={() => { window.history.pushState(null, "", "/accounts"); window.dispatchEvent(new Event("popstate")); }}>
            Open accounts
          </Button>
        </div>
      </div>
    );
  }

  const platform = String(account.platform || "").toLowerCase();
  const isMt5 = platform === "mt5" || account.importSource === "mt5_bridge";
  const isCTrader = platform === "ctrader" || account.importSource === "ctrader";
  const isTradovate = platform === "tradovate" || account.importSource === "tradovate";
  const connectorActive = isMt5 || isCTrader || isTradovate;
  const connector = connectorLabel(account);

  return (
    <div className="animate-page-in mx-auto max-w-[1500px] space-y-5 p-5 lg:p-7">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">
            <Settings size={15} /> Selected account / settings
          </p>
          <h1 className="mt-2 text-[2rem] font-black tracking-tight text-white">{account.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">Change account details, manage connector settings and keep import/sync healthy.</p>
        </div>
        <div className="w-full lg:w-[320px]">
          <Select value={account.id} onValueChange={setActiveAccount}>
            <SelectTrigger className="h-11 rounded-2xl border-white/10 bg-[#050505]"><SelectValue /></SelectTrigger>
            <SelectContent>{accounts.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4 rounded-[1.5rem] border border-white/8 bg-[#0b0b0b] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-white/8 bg-[#050505] text-zinc-300"><SlidersHorizontal size={20} /></span>
            <div>
              <h2 className="font-black text-white">Account profile</h2>
              <p className="text-xs text-zinc-500">Basic display fields used across cards, Overview, Analytics and proof views.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Account name<Input value={name} maxLength={60} onChange={(event) => setName(event.target.value)} className="mt-1.5" /></label>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Firm / broker<Input value={firm} maxLength={80} onChange={(event) => setFirm(event.target.value)} className="mt-1.5" /></label>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Phase<Input value={phase} maxLength={40} onChange={(event) => setPhase(event.target.value)} className="mt-1.5" /></label>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Mini label="Type" value={account.accountType === "real" ? "Real" : "Prop"} />
            <Mini label="Market" value={account.marketType} />
            <Mini label="Size" value={cash.format(account.accountSize)} />
            <Mini label="Status" value={account.status} />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button onClick={() => void saveProfile()} disabled={saving} className="bg-white text-black hover:bg-zinc-200">
              {saving ? <Spinner className="size-4" /> : <CheckCircle2 size={15} />} Save changes
            </Button>
            {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
          </div>
        </section>

        <aside className="space-y-3 rounded-[1.5rem] border border-white/8 bg-[#0b0b0b] p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500"><ShieldCheck size={14} /> Connector status</p>
          <div className="rounded-2xl border border-white/8 bg-[#050505] p-4">
            <div className="flex items-center gap-3">
              <span className={`grid size-10 place-items-center rounded-2xl border ${connectorActive ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-[#050505] text-zinc-300"}`}>
                <Wifi size={18} />
              </span>
              <div>
                <p className="text-sm font-black text-white">{connector}</p>
                <p className="text-xs text-zinc-500">
                  {isMt5
                    ? "Auto-sync connector is attached to this account."
                    : isTradovate
                      ? "Tradovate OAuth futures sync is available for this account."
                      : isCTrader
                        ? "cTrader CSV import is active for this account."
                        : "Manual or reserved connector workspace."}
                </p>
              </div>
            </div>
          </div>
          <Mini label="Platform" value={(account.platform || "manual").toUpperCase()} />
          <Mini label="Import source" value={account.importSource || "manual"} />
          <Mini label="Prop login" value={hidePersonalInfo && account.propLogin ? `••••${account.propLogin.slice(-3)}` : account.propLogin || "-"} />
          <Button variant="outline" className="w-full" onClick={() => void refreshAccounts()}>Refresh account data</Button>
        </aside>
      </div>

      <section className="rounded-[1.5rem] border border-white/8 bg-[#0b0b0b] p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-white">Connectors</h2>
            <p className="mt-1 text-sm text-zinc-500">Connector settings change based on the selected account platform.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-[#050505] px-3 py-1 text-[11px] font-bold uppercase text-zinc-400">{account.platform || "manual"}</span>
        </div>

        {isMt5 ? (
          <Mt5Settings account={account} onSynced={refreshAccounts} />
        ) : isTradovate ? (
          <TradovateSettings account={account} onSynced={refreshAccounts} />
        ) : isCTrader ? (
          <CTraderSettings account={account} onImported={refreshAccounts} />
        ) : (
          <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-white/10 bg-black/20 text-center">
            <div>
              <h3 className="text-lg font-black text-white">{connector}</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">This connector settings panel is reserved here. MT5, Tradovate and cTrader settings appear automatically for supported accounts.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/8 bg-[#050505] p-3"><p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}</p><p className="mt-1 truncate text-sm font-bold text-white">{value}</p></div>;
}
