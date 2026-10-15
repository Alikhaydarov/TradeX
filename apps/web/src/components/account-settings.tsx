"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, RefreshCw, Upload, Unplug } from "lucide-react";
import { clientApi } from "@/lib/client-api";

type Account = { id: string; name: string; firm: string | null; platform: string | null; market_type: string | null; account_type: string | null; account_size: number; initial_balance: number; status: string };
type Connection = { id: string; account_login: string; broker_server: string; status: string; last_error: string | null; last_synced_at: string | null };

export function AccountSettings({ account, paid, connection: initialConnection, bridgeConfigured }: { account: Account; paid: boolean; connection: Connection | null; bridgeConfigured: boolean }) {
  const router = useRouter();
  const [connection, setConnection] = useState(initialConnection);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const platform = String(account.platform || "manual").toLowerCase();

  async function connect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setMessage("");
    const form = event.currentTarget;
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const result = await clientApi<{ connection: Connection }>(`/api/accounts/${account.id}/mt5`, { method: "PUT", body: JSON.stringify(payload) });
      setConnection(result.connection); form.reset(); setMessage("Credentials saved. Sync to import your closed trades."); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connection failed."); }
    finally { setBusy(false); }
  }

  async function sync() {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await clientApi<{ imported: number; scanned: number }>(`/api/accounts/${account.id}/mt5/sync`, { method: "POST" });
      setMessage(`${result.imported} new trades imported from ${result.scanned} closed positions.`);
      const status = await clientApi<{ connection: Connection }>(`/api/accounts/${account.id}/mt5`);
      setConnection(status.connection); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sync failed."); }
    finally { setBusy(false); }
  }

  async function disconnect() {
    if (busy || !window.confirm("Disconnect MT5? Imported trades will stay in your journal.")) return;
    setBusy(true); setError("");
    try { await clientApi(`/api/accounts/${account.id}/mt5`, { method: "DELETE" }); setConnection(null); setMessage("MT5 disconnected."); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Disconnect failed."); }
    finally { setBusy(false); }
  }

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !fileRef.current?.files?.[0]) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const form = new FormData(); form.append("file", fileRef.current.files[0]);
      const response = await fetch(`/api/accounts/${account.id}/import`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Import failed.");
      setMessage(`${result.imported} trades imported. ${result.duplicates} duplicates skipped.`);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Import failed."); }
    finally { setBusy(false); }
  }

  return <main className="account-settings-page">
    <Link className="account-settings-back" href="/accounts"><ArrowLeft size={16} /> Accounts</Link>
    <header><div><p className="section-label">ACCOUNT SETTINGS</p><h1>{account.name}</h1><p>{account.firm || (account.account_type === "real" ? "Real account" : "Prop account")} · {platform === "manual" ? "Manual journal" : platform.toUpperCase()}</p></div><Link href="/dashboard" onClick={() => { document.cookie = `tradoxy_account=${account.id}; Path=/; Max-Age=31536000; SameSite=Lax`; router.refresh(); }}>Open dashboard</Link></header>
    {(error || message) && <p className={error ? "trade-error" : "account-settings-success"} role="status">{error || message}</p>}
    <section className="account-settings-panel"><h2>Connection</h2>
      {platform === "manual" ? <p>Manual account. Add trades directly from the journal.</p> : !paid ? <p>Platform connections require Standard or Pro.</p> : platform === "mt5" ? <>
        {!bridgeConfigured && <p className="trade-error">MT5 bridge is unavailable on this deployment. Credentials cannot be connected yet.</p>}
        {connection && <div className="account-connection-status"><CheckCircle2 size={18} /><div><strong>{connection.account_login} · {connection.broker_server}</strong><span>{connection.status} · Last sync {connection.last_synced_at ? new Date(connection.last_synced_at).toLocaleString() : "never"}</span>{connection.last_error && <span className="negative">{connection.last_error}</span>}</div></div>}
        <form onSubmit={connect} className="account-connection-form"><label>MT5 login<input name="login" inputMode="numeric" pattern="[0-9]+" required defaultValue={connection?.account_login || ""} /></label><label>Broker server<input name="server" required defaultValue={connection?.broker_server || ""} placeholder="Broker-Server" /></label><label>Investor password<input name="password" type="password" autoComplete="off" required placeholder="Read-only password" /></label><button type="submit" disabled={busy || !bridgeConfigured}>{connection ? "Update connection" : "Connect MT5"}</button></form>
        {connection && <div className="account-connection-actions"><button onClick={() => void sync()} disabled={busy || !bridgeConfigured}><RefreshCw size={15} /> {busy ? "Syncing..." : "Sync closed trades"}</button><button onClick={() => void disconnect()} disabled={busy}><Unplug size={15} /> Disconnect</button></div>}
        <p className="account-settings-hint">Use an investor/read-only password. The first sync scans up to two years; later syncs include a seven-day overlap.</p>
      </> : <><p>Import your {platform.toUpperCase()} closed-trade CSV export. Duplicates are skipped automatically.</p><form onSubmit={upload} className="account-connection-form"><label>CSV file<input ref={fileRef} type="file" accept=".csv,text/csv" required /></label><button disabled={busy} type="submit"><Upload size={15} /> {busy ? "Importing..." : "Import trades"}</button></form></>}
    </section>
  </main>;
}
