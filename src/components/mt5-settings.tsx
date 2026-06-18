"use client";

import { LoaderCircle, RefreshCw, Settings, ShieldCheck, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import type { PropAccount } from "./types";

type Connection = { login: string; server: string; metaapi_account_id: string | null; status: string; last_error: string | null; last_synced_at: string | null };

export function Mt5Settings({ account, onSynced }: { account: PropAccount; onSynced: () => Promise<void> }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("");
  const [metaApiAccountId, setMetaApiAccountId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<{ connection: Connection | null }>(`/api/prop-accounts/${account.id}/mt5`).then(({ connection: value }) => {
      if (!active || !value) return;
      setConnection(value); setLogin(value.login); setServer(value.server); setMetaApiAccountId(value.metaapi_account_id || "");
    }).catch(() => undefined);
    return () => { active = false; };
  }, [account.id]);

  const connect = async () => {
    setBusy(true); setMessage("");
    try {
      const response = await apiRequest<{ connection: Connection }>(`/api/prop-accounts/${account.id}/mt5`, { method: "PUT", body: JSON.stringify({ login, password, server, metaApiAccountId }) });
      setConnection(response.connection); setPassword(""); setMessage("MT5 account connected.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Connection failed."); }
    finally { setBusy(false); }
  };

  const sync = async () => {
    setBusy(true); setMessage("");
    try {
      const result = await apiRequest<{ imported: number; scanned: number; lastSyncedAt: string }>(`/api/prop-accounts/${account.id}/mt5/sync`, { method: "POST" });
      await onSynced();
      setConnection(current => current ? { ...current, status: "connected", last_synced_at: result.lastSyncedAt, last_error: null } : current);
      setMessage(`${result.imported} new trades imported from ${result.scanned} closed positions.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Sync failed."); }
    finally { setBusy(false); }
  };

  const disconnect = async () => {
    setBusy(true); setMessage("");
    try {
      await apiRequest(`/api/prop-accounts/${account.id}/mt5`, { method: "DELETE" });
      setConnection(null); setPassword(""); setMessage("MT5 account disconnected.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Disconnect failed."); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <Card><CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted"><Settings size={19} /></span><div><h3 className="font-black">MetaTrader 5 connection</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Connect through MetaApi and import closed trades into this journal.</p></div></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-xs text-muted-foreground">MT5 login<Input value={login} onChange={event => setLogin(event.target.value)} inputMode="numeric" placeholder="12345678" /></label>
          <label className="grid gap-2 text-xs text-muted-foreground">Broker server<Input value={server} onChange={event => setServer(event.target.value)} placeholder="Broker-Server" /></label>
          <label className="grid gap-2 text-xs text-muted-foreground">MT5 password<Input value={password} onChange={event => setPassword(event.target.value)} type="password" placeholder={connection ? "Enter to reconnect" : "Investor password"} /></label>
          <label className="grid gap-2 text-xs text-muted-foreground">MetaApi account ID<Input value={metaApiAccountId} onChange={event => setMetaApiAccountId(event.target.value)} placeholder="MetaApi UUID" /></label>
        </div>
        {message ? <p className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs">{message}</p> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button disabled={busy || !login || !password || !server || !metaApiAccountId} onClick={() => void connect()}>{busy ? <LoaderCircle className="animate-spin" size={16} /> : <ShieldCheck size={16} />}{connection ? "Reconnect" : "Connect MT5"}</Button>
          {connection ? <Button variant="outline" disabled={busy} onClick={() => void sync()}><RefreshCw className={busy ? "animate-spin" : ""} size={16} />Sync history</Button> : null}
          {connection ? <Button variant="destructive" disabled={busy} onClick={() => void disconnect()}><Unplug size={16} />Disconnect</Button> : null}
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Connection status</p>
        <div className="mt-4 flex items-center gap-2"><span className={`size-2 rounded-full ${connection?.status === "connected" ? "bg-emerald-400" : connection?.status === "error" ? "bg-rose-400" : "bg-zinc-600"}`} /><strong className="capitalize">{connection?.status || "Not connected"}</strong></div>
        <Separator className="my-4" />
        <dl className="space-y-3 text-xs">
          <div><dt className="text-muted-foreground">Account</dt><dd className="mt-1 font-mono">{connection?.login || "-"}</dd></div>
          <div><dt className="text-muted-foreground">Server</dt><dd className="mt-1 truncate">{connection?.server || "-"}</dd></div>
          <div><dt className="text-muted-foreground">Last sync</dt><dd className="mt-1">{connection?.last_synced_at ? new Date(connection.last_synced_at).toLocaleString("en-US") : "Never"}</dd></div>
        </dl>
        {connection?.last_error ? <p className="mt-4 text-xs leading-5 text-rose-300">{connection.last_error}</p> : null}
      </CardContent></Card>
    </div>
  );
}
