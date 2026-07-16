"use client";

import { CheckCircle2, KeyRound, RefreshCw, Server, Unplug, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Spinner } from "./ui/spinner";
import type { PropAccount } from "./types";

type Connection = {
  login: string;
  server: string;
  platform: string;
  status: string;
  last_error: string | null;
  last_synced_at: string | null;
  auto_sync: boolean;
};

type ConnectorStatus = {
  configured: boolean;
  reachable: boolean;
  mode: "mt5_api" | "mt5_bridge";
  serviceOk: boolean;
  syncIntervalSeconds: number | null;
  accountFetch: unknown;
  error: string | null;
};

export function Mt5Settings({ account, onSynced }: { account: PropAccount; onSynced: () => Promise<void> }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("");
  const [bridgeConfigured, setBridgeConfigured] = useState(false);
  const [connectorStatus, setConnectorStatus] = useState<ConnectorStatus | null>(null);
  const [busy, setBusy] = useState<"save" | "disconnect" | "sync" | null>(null);
  const [message, setMessage] = useState("");
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const loadConnection = useCallback(async () => {
    const { connection: c, isVerified: v, bridgeConfigured: m, connectorStatus: status } = await apiRequest<{
      connection: Connection | null;
      isVerified: boolean;
      bridgeConfigured: boolean;
      connectorStatus: ConnectorStatus | null;
    }>(
      `/api/prop-accounts/${account.id}/mt5`
    );
    setIsVerified(v);
    setBridgeConfigured(m);
    setConnectorStatus(status);
    if (!c) {
      setConnection(null);
      return;
    }
    setConnection(c);
    setLogin(c.login ?? "");
    setServer(c.server ?? "");
  }, [account.id]);

  useEffect(() => {
    void loadConnection().catch(() => setIsVerified(false));
  }, [loadConnection]);

  useEffect(() => {
    if (!connection) return undefined;
    const refresh = () => {
      if (document.visibilityState === "visible") void Promise.all([onSynced(), loadConnection()]);
    };
    const id = window.setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [connection, onSynced, loadConnection]);

  const save = async () => {
    if (!login || !password || !server) {
      setMessage("Login, parol va server nomini kiriting.");
      return;
    }
    setBusy("save");
    setMessage("");
    try {
      const { connection: c } = await apiRequest<{ connection: Connection; bridgeConfigured: boolean }>(
        `/api/prop-accounts/${account.id}/mt5`,
        { method: "PUT", body: JSON.stringify({ login, password, server }) }
      );
      setConnection(c);
      setPassword("");
      await Promise.all([onSynced(), loadConnection()]);
      setMessage("MT5 ma'lumotlari saqlandi. Auto-sync avtomatik ishlaydi.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Saqlanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy("disconnect");
    setMessage("");
    try {
      await apiRequest(`/api/prop-accounts/${account.id}/mt5`, { method: "DELETE" });
      setConnection(null);
      setLogin("");
      setPassword("");
      setServer("");
      setDisconnectOpen(false);
      setMessage("MT5 ajratildi.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Xato.");
    } finally {
      setBusy(null);
    }
  };

  const syncMissingTrades = async () => {
    if (!connection) {
      setMessage("Avval MT5 connection qo'shing.");
      return;
    }
    setBusy("sync");
    setMessage("");
    try {
      const result = await apiRequest<{ imported?: number; journalImported?: number; message?: string }>(
        `/api/prop-accounts/${account.id}/mt5/sync`,
        { method: "POST", body: JSON.stringify({ force_rescan: true }) }
      );
      await Promise.all([onSynced(), loadConnection()]);
      const imported = result.journalImported ?? result.imported ?? 0;
      setMessage(result.message || `Advanced sync completed. ${imported} trades checked.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Advanced sync failed.");
    } finally {
      setBusy(null);
    }
  };

  const statusColor = (s?: string) => {
    if (s === "connected") return "text-emerald-400";
    if (s === "pending") return "text-sky-400";
    if (s === "error") return "text-rose-400";
    return "text-zinc-500";
  };

  const lastSync = connection?.last_synced_at
    ? new Date(connection.last_synced_at).toLocaleString("uz-UZ")
    : null;

  const workerStateLabel = !connectorStatus?.configured
    ? "Not configured"
    : connectorStatus.reachable
      ? "Worker alive"
      : "Worker offline";

  const workerStateClass = !connectorStatus?.configured
    ? "text-amber-400"
    : connectorStatus.reachable
      ? "text-emerald-400"
      : "text-rose-400";

  return (
    <div className="space-y-3 px-3 pb-4 sm:space-y-4 sm:px-4">
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-semibold ${workerStateClass}`}>{workerStateLabel}</span>
          <span className="rounded-full border border-white/10 bg-white/[.03] px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
            {connectorStatus?.mode === "mt5_api" ? "VPS API" : "Legacy bridge"}
          </span>
          {connectorStatus?.syncIntervalSeconds ? (
            <span className="rounded-full border border-white/10 bg-white/[.03] px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
              {connectorStatus.syncIntervalSeconds}s loop
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-[11px] leading-5 text-zinc-500">
          {connectorStatus?.reachable
            ? "TradeWay VPS worker is reachable. Auto sync should continue without manually pressing Start."
            : "Connector service is unavailable right now. Try again later or contact support."}
        </p>
      </div>

      {connection && (
        <div className={`rounded-2xl border px-3 py-3 text-sm sm:px-4 ${
          connection.status === "connected"
            ? "border-emerald-500/20 bg-emerald-500/5"
            : connection.status === "pending"
              ? "border-sky-500/20 bg-sky-500/5"
            : connection.status === "error"
              ? "border-rose-500/20 bg-rose-500/5"
              : "border-[#2a2a2a] bg-[#1b1b1b]"
        }`}>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${connection.status === "connected" ? "bg-emerald-400" : connection.status === "pending" ? "animate-pulse bg-sky-400" : connection.status === "error" ? "animate-pulse bg-rose-400" : "bg-zinc-600"}`} />
                <span className={`text-xs font-semibold ${statusColor(connection.status)}`}>
                  {connection.status === "connected" ? "Ulangan" : connection.status === "pending" ? "Sync qilinyapti" : connection.status === "error" ? "Xato" : "Tayyor"}
                </span>
                <span className="max-w-full truncate font-mono text-[11px] text-zinc-400 sm:text-xs">{connection.login} @ {connection.server}</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  <CheckCircle2 size={10} /> Auto-sync
                </span>
                <span className="rounded-full border border-white/10 bg-white/[.03] px-2 py-0.5 text-[10px] font-semibold text-zinc-500">30s refresh</span>
                <span className="rounded-full border border-white/10 bg-white/[.03] px-2 py-0.5 text-[10px] font-semibold text-zinc-500">periodic rescan</span>
                {lastSync ? <span className="text-[10px] text-zinc-600">{lastSync}</span> : null}
              </div>

              {connection.last_error && <p className="break-words text-[10px] text-rose-500">{connection.last_error}</p>}
            </div>

            <button type="button" aria-label="Disconnect MT5" onClick={() => setDisconnectOpen(true)} disabled={!!busy}
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#2a2a2a] text-zinc-600 transition hover:border-rose-500/30 hover:text-rose-400 disabled:opacity-50">
              {busy === "disconnect" ? <Spinner className="size-3.5" /> : <Unplug size={13} />}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-[#2a2a2a] bg-[#141414] p-3 sm:p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">
          <KeyRound size={12} /> MT5 Credentials
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-[10px] font-semibold uppercase text-[#8a8a8a]">
              <UserRound size={10} /> Login
            </label>
            <input value={login} onChange={e => setLogin(e.target.value.replace(/\D/g, "").slice(0, 20))}
              placeholder="12345678" inputMode="numeric" autoComplete="off" spellCheck={false}
              className="h-10 w-full rounded-xl border border-[#2a2a2a] bg-[#0e0e0e] px-3 font-mono text-sm text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-white/20" />
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-[10px] font-semibold uppercase text-[#8a8a8a]">
              <KeyRound size={10} /> Parol
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value.slice(0, 128))}
              placeholder="••••••••" autoComplete="new-password" spellCheck={false}
              className="h-10 w-full rounded-xl border border-[#2a2a2a] bg-[#0e0e0e] px-3 text-sm text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-white/20" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-1 text-[10px] font-semibold uppercase text-[#8a8a8a]">
            <Server size={10} /> Broker Server
          </label>
          <input value={server} onChange={e => setServer(e.target.value.slice(0, 120))} autoComplete="off" spellCheck={false}
            placeholder="Exness-MT5Trial, ICMarketsEU-Live04 ..."
            className="h-10 w-full rounded-xl border border-[#2a2a2a] bg-[#0e0e0e] px-3 text-sm text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-white/20" />
          <p className="text-[10px] text-zinc-700">MT5 → Tools → Options → Server</p>
        </div>

        <button type="button" onClick={() => void save()} disabled={!!busy}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white text-xs font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50">
            {busy === "save" ? <Spinner className="size-3.5" /> : <KeyRound size={13} />}
          {connection ? "Ma'lumotlarni yangilash" : "MT5 ulash va auto-sync yoqish"}
        </button>
        {connection ? (
          <button type="button" onClick={() => void syncMissingTrades()} disabled={!!busy}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.035] text-xs font-bold text-zinc-100 transition hover:bg-white/[.06] disabled:opacity-50">
            {busy === "sync" ? <Spinner className="size-3.5" /> : <RefreshCw size={13} />}
            Sync missing closed trades
          </button>
        ) : null}
      </div>

      {!bridgeConfigured && (
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 px-3 py-3 sm:px-4">
          <p className="text-xs font-semibold text-amber-400">MT5 worker is not configured</p>
          <p className="mt-1 break-words text-[11px] leading-5 text-amber-600">
            Live import is temporarily unavailable. Your credentials stay saved; contact support if the status does not recover.
          </p>
        </div>
      )}

      {message && (
        <p className={`break-words rounded-2xl border px-3 py-2 text-xs leading-5 ${
          message.includes("xato") || message.includes("Saqlanmadi")
            ? "border-rose-500/20 text-rose-400"
            : "border-emerald-500/20 text-emerald-400"
        }`}>{message}</p>
      )}

      {isVerified === false && (
        <p className="text-center text-[11px] text-zinc-600">
          Auto-sync verified akaunts uchun mavjud.
        </p>
      )}

      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent className="border-white/10 bg-[#080808]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Disconnect MT5?</AlertDialogTitle>
            <AlertDialogDescription>This stops automatic imports for this account. Existing journal trades will not be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-500" onClick={() => void disconnect()}>Disconnect</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
