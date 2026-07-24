"use client";

import dynamic from "next/dynamic";
import {
  CheckCircle2,
  Database,
  RefreshCw,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  WalletCards,
  Wifi,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useActiveAccountStore } from "./active-account-context";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Spinner } from "./ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { PropAccount } from "./types";
import { useWorkspacePreferences } from "./workspace-preferences-context";

const Mt5Settings = dynamic(
  () => import("./mt5-settings").then((module) => module.Mt5Settings),
  { ssr: false, loading: ConnectorLoading },
);
const CTraderSettings = dynamic(
  () => import("./ctrader-settings").then((module) => module.CTraderSettings),
  { ssr: false, loading: ConnectorLoading },
);
const TradovateCsvSettings = dynamic(
  () => import("./tradovate-csv-settings").then((module) => module.TradovateCsvSettings),
  { ssr: false, loading: ConnectorLoading },
);

const cash = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

type SettingsTab = "profile" | "connector";

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

function connectorMeta(account: PropAccount) {
  const platform = String(account.platform || "manual").toLowerCase();
  const source = String(account.importSource || "manual").toLowerCase();

  if (platform === "mt5" || source === "mt5_bridge") {
    return { type: "mt5" as const, label: "MT5 Auto Sync", description: "Read-only automatic trade synchronization.", tone: "auto" as const };
  }
  if (platform === "tradovate" || source === "tradovate") {
    return { type: "tradovate" as const, label: "Tradovate CSV Import", description: "Position History report import for futures trades.", tone: "csv" as const };
  }
  if (platform === "ctrader" || source === "ctrader") {
    return { type: "ctrader" as const, label: "cTrader CSV Import", description: "Closed trade-history CSV import.", tone: "csv" as const };
  }
  if (platform === "ninjatrader") {
    return { type: "unsupported" as const, label: "NinjaTrader", description: "Connector workspace is reserved.", tone: "idle" as const };
  }
  if (platform === "projectx") {
    return { type: "unsupported" as const, label: "Project X", description: "Connector workspace is reserved.", tone: "idle" as const };
  }
  return { type: "manual" as const, label: "Manual Journal", description: "Trades are entered manually.", tone: "idle" as const };
}

export function AccountSettings({ onLogin: _onLogin }: { onLogin: () => void }) {
  void _onLogin;
  const { accounts, activeAccountId, setActiveAccount, setAccounts, refreshAccounts } = useActiveAccountStore();
  const { hidePersonalInfo } = useWorkspacePreferences();
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [name, setName] = useState("");
  const [firm, setFirm] = useState("");
  const [phase, setPhase] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSwitching, startTransition] = useTransition();

  const account = useMemo(
    () => accounts.find((item) => item.id === activeAccountId) || null,
    [accounts, activeAccountId],
  );
  const connector = useMemo(() => account ? connectorMeta(account) : null, [account]);

  useEffect(() => {
    setName(account?.name || "");
    setFirm(account?.firm || "");
    setPhase(account?.phase || "");
    setMessage("");
  }, [account?.id, account?.name, account?.firm, account?.phase]);

  const saveProfile = async () => {
    if (!account || saving) return;
    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 60) {
      setMessage("Account name must be between 2 and 60 characters.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await apiRequest<{ account: Record<string, unknown> }>(
        `/api/prop-accounts/${account.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: cleanName,
            firm: firm.trim().slice(0, 80),
            phase: phase.trim().slice(0, 40),
          }),
        },
      );
      const updated = accountFrom(response.account);
      setAccounts(accounts.map((item) => item.id === updated.id ? updated : item));
      setMessage("Account settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Settings were not saved.");
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshAccounts();
    } finally {
      setRefreshing(false);
    }
  };

  if (!account || !connector) {
    return (
      <div className="mx-auto grid min-h-[70dvh] max-w-2xl place-items-center p-4 text-center sm:p-5">
        <div className="rounded-[1.5rem] border border-white/8 bg-[#0b0b0b] p-6">
          <WalletCards className="mx-auto text-zinc-400" size={34} />
          <h1 className="mt-4 text-2xl font-black text-white">Select an account first</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Settings are attached to one selected prop or real account.</p>
          <Button className="mt-5 bg-white text-black hover:bg-zinc-200" onClick={() => {
            window.history.pushState(null, "", "/accounts");
            window.dispatchEvent(new Event("popstate"));
          }}>
            Open accounts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto w-full max-w-[1280px] space-y-4 p-3 pb-24 sm:p-5 sm:pb-8 lg:p-7", isSwitching && "opacity-80")}>
      <header className="rounded-[1.4rem] border border-white/8 bg-[#090909] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              <Settings size={14} /> Account settings
            </p>
            <h1 className="mt-2 truncate text-[1.65rem] font-black tracking-[-0.04em] text-white sm:text-[2rem]">{account.name}</h1>
            <p className="mt-1 text-xs leading-5 text-zinc-500 sm:text-sm">Manage account details and import or sync trade history.</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <Select
              value={account.id}
              onValueChange={(value) => startTransition(() => setActiveAccount(value))}
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-[#050505] sm:w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={() => void refresh()} disabled={refreshing} className="h-11 border-white/10 bg-[#050505]">
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-white/8 bg-black p-1">
          <TabButton active={tab === "profile"} onClick={() => setTab("profile")} icon={<UserRound size={15} />} label="Profile" />
          <TabButton active={tab === "connector"} onClick={() => setTab("connector")} icon={<Database size={15} />} label="Import / Sync" />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mini label="Type" value={account.accountType === "real" ? "Real" : "Prop"} />
        <Mini label="Market" value={account.marketType} />
        <Mini label="Size" value={cash.format(account.accountSize)} />
        <Mini label="Status" value={account.status} />
      </section>

      {tab === "profile" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[1.4rem] border border-white/8 bg-[#090909] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/8 bg-[#050505] text-zinc-300"><SlidersHorizontal size={18} /></span>
              <div>
                <h2 className="font-black text-white">Account profile</h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500">These fields are used across dashboard, analytics and account cards.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Field label="Account name">
                <Input value={name} maxLength={60} onChange={(event) => setName(event.target.value)} />
              </Field>
              <Field label="Firm / broker">
                <Input value={firm} maxLength={80} onChange={(event) => setFirm(event.target.value)} />
              </Field>
              <Field label="Phase">
                <Input value={phase} maxLength={40} onChange={(event) => setPhase(event.target.value)} />
              </Field>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button onClick={() => void saveProfile()} disabled={saving} className="bg-white text-black hover:bg-zinc-200">
                {saving ? <Spinner className="size-4" /> : <CheckCircle2 size={15} />} Save changes
              </Button>
              {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
            </div>
          </section>

          <aside className="rounded-[1.4rem] border border-white/8 bg-[#090909] p-4 sm:p-5">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500"><ShieldCheck size={14} /> Account details</p>
            <div className="mt-4 space-y-2">
              <Detail label="Platform" value={(account.platform || "manual").toUpperCase()} />
              <Detail label="Import source" value={account.importSource || "manual"} />
              <Detail
                label="Prop login"
                value={hidePersonalInfo && account.propLogin ? `••••${account.propLogin.slice(-3)}` : account.propLogin || "-"}
              />
              <Detail label="Start date" value={account.startDate || "-"} />
            </div>
          </aside>
        </div>
      ) : (
        <section className="rounded-[1.4rem] border border-white/8 bg-[#090909] p-3 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl border",
                connector.tone === "auto"
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  : connector.tone === "csv"
                    ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                    : "border-white/10 bg-[#050505] text-zinc-400",
              )}>
                <Wifi size={17} />
              </span>
              <div className="min-w-0">
                <h2 className="truncate font-black text-white">{connector.label}</h2>
                <p className="mt-0.5 text-xs leading-5 text-zinc-500">{connector.description}</p>
              </div>
            </div>
            <span className={cn(
              "w-fit rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider",
              connector.tone === "auto"
                ? "bg-emerald-400/10 text-emerald-300"
                : connector.tone === "csv"
                  ? "bg-amber-400/10 text-amber-300"
                  : "bg-white/6 text-zinc-500",
            )}>
              {connector.tone === "auto" ? "Automatic" : connector.tone === "csv" ? "CSV import" : "Manual"}
            </span>
          </div>

          {connector.type === "mt5" ? (
            <Mt5Settings account={account} onSynced={refreshAccounts} />
          ) : connector.type === "tradovate" ? (
            <TradovateCsvSettings account={account} onImported={refreshAccounts} />
          ) : connector.type === "ctrader" ? (
            <CTraderSettings account={account} onImported={refreshAccounts} />
          ) : (
            <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 text-center">
              <div>
                <h3 className="text-lg font-black text-white">{connector.label}</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">No connector is active for this account. Trades can still be added manually from the journal.</p>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ConnectorLoading() {
  return (
    <div className="space-y-3 rounded-2xl border border-white/8 bg-[#070707] p-4 sm:p-6">
      <div className="h-11 w-48 animate-pulse rounded-xl bg-white/[.07]" />
      <div className="h-4 max-w-xl animate-pulse rounded bg-white/[.05]" />
      <div className="h-28 animate-pulse rounded-2xl bg-white/[.04]" />
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-black transition",
        active ? "bg-white text-black" : "text-zinc-500 hover:bg-white/[.05] hover:text-white",
      )}
    >
      {icon} {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}<div className="mt-1.5">{children}</div></label>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/8 bg-[#090909] p-3 sm:p-4">
      <p className="text-[9px] font-black uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#050505] px-3 py-2.5">
      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600">{label}</span>
      <strong className="min-w-0 truncate text-xs text-white">{value}</strong>
    </div>
  );
}
