"use client";

import { Check, Copy, Download, KeyRound, LoaderCircle, RefreshCw, Settings, Unplug } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import type { PropAccount } from "./types";

type Connection = { status: string; token_prefix: string | null; last_seen_at: string | null; last_synced_at: string | null; last_error: string | null };

export function Mt5Settings({ account, onSynced }: { account: PropAccount; onSynced: () => Promise<void> }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [message, setMessage] = useState("");
  const [origin, setOrigin] = useState("https://your-domain.com");
  const endpoint = `${origin}/api/mt5/import`;

  const load = useCallback(() => apiRequest<{ connection: Connection | null }>(`/api/prop-accounts/${account.id}/mt5`)
    .then(({ connection: value }) => setConnection(value)).catch(() => undefined), [account.id]);

  useEffect(() => {
    setOrigin(window.location.origin);
    void load();
  }, [load]);
  useEffect(() => {
    if (!connection) return;
    const timer = window.setInterval(() => {
      void load();
      void onSynced();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [connection, load, onSynced]);

  const generate = async () => {
    setBusy(true); setMessage("");
    try {
      const response = await apiRequest<{ connection: Connection; token: string }>(`/api/prop-accounts/${account.id}/mt5`, { method: "POST" });
      setConnection(response.connection); setToken(response.token);
      setMessage("Token created. Copy it now; it will not be shown again.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Token generation failed."); }
    finally { setBusy(false); }
  };

  const disconnect = async () => {
    setBusy(true); setMessage("");
    try {
      await apiRequest(`/api/prop-accounts/${account.id}/mt5`, { method: "DELETE" });
      setConnection(null); setToken(""); setMessage("MT5 access revoked.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Revoke failed."); }
    finally { setBusy(false); }
  };

  const copy = async (value: string, type: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(""), 1500);
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Card><CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted"><Settings size={19} /></span><div><h3 className="font-black">TradeWay MT5 Expert Advisor</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">No broker password and no third-party cloud. The EA reads closed trades inside your terminal and sends them securely to this journal.</p></div></div>
        <div className="mt-6 space-y-4">
          <SetupRow number="1" title="Download the EA" text="Open it in MetaEditor, compile it, then attach it to any chart."><Button variant="outline" asChild><a href="/mt5/TradeWayHistorySync.mq5" download><Download size={16} />Download .mq5</a></Button></SetupRow>
          <SetupRow number="2" title="Allow the WebRequest URL" text="MT5 → Tools → Options → Expert Advisors → Allow WebRequest for listed URL."><CopyField value={origin} copied={copied === "origin"} onCopy={() => void copy(origin, "origin")} /></SetupRow>
          <SetupRow number="3" title="Generate an access token" text="Paste the one-time token into the EA input named TradeWayToken."><Button disabled={busy} onClick={() => void generate()}>{busy ? <LoaderCircle className="animate-spin" size={16} /> : <KeyRound size={16} />}{connection ? "Regenerate token" : "Generate token"}</Button></SetupRow>
          {token ? <div className="rounded-xl border border-amber-300/15 bg-amber-400/[.06] p-3"><p className="text-xs font-bold text-amber-100">Copy this token now</p><CopyField value={token} copied={copied === "token"} onCopy={() => void copy(token, "token")} /></div> : null}
          <SetupRow number="4" title="Set the endpoint" text="Paste this value into the EA input named TradeWayEndpoint."><CopyField value={endpoint} copied={copied === "endpoint"} onCopy={() => void copy(endpoint, "endpoint")} /></SetupRow>
        </div>
        {message ? <p className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs">{message}</p> : null}
        {connection ? <Button variant="destructive" className="mt-5" disabled={busy} onClick={() => void disconnect()}><Unplug size={16} />Revoke MT5 access</Button> : null}
      </CardContent></Card>
      <Card><CardContent className="p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sync status</p>
        <div className="mt-4 flex items-center gap-2"><span className={`size-2 rounded-full ${connection?.status === "connected" ? "bg-emerald-400" : connection ? "bg-amber-300" : "bg-zinc-600"}`} /><strong className="capitalize">{connection?.status || "Not configured"}</strong></div>
        <Separator className="my-4" />
        <dl className="space-y-3 text-xs">
          <div><dt className="text-muted-foreground">Token</dt><dd className="mt-1 font-mono">{connection?.token_prefix ? `${connection.token_prefix}...` : "-"}</dd></div>
          <div><dt className="text-muted-foreground">EA last seen</dt><dd className="mt-1">{formatDate(connection?.last_seen_at)}</dd></div>
          <div><dt className="text-muted-foreground">Last import</dt><dd className="mt-1">{formatDate(connection?.last_synced_at)}</dd></div>
        </dl>
        {connection ? <Button variant="outline" className="mt-5 w-full" onClick={() => { void load(); void onSynced(); }}><RefreshCw size={15} />Refresh status</Button> : null}
        {connection?.last_error ? <p className="mt-4 text-xs leading-5 text-rose-300">{connection.last_error}</p> : null}
      </CardContent></Card>
    </div>
  );
}

function SetupRow({ number, title, text, children }: { number: string; title: string; text: string; children: React.ReactNode }) {
  return <div className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:items-center"><span className="grid size-8 place-items-center rounded-lg bg-muted text-xs font-black">{number}</span><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div><div className="min-w-0">{children}</div></div>;
}

function CopyField({ value, copied, onCopy }: { value: string; copied: boolean; onCopy: () => void }) {
  return <div className="mt-2 flex min-w-0 gap-2 sm:mt-0"><Input readOnly value={value} className="min-w-0 font-mono text-xs" /><Button variant="outline" size="icon" onClick={onCopy} aria-label="Copy">{copied ? <Check size={15} /> : <Copy size={15} />}</Button></div>;
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("en-US") : "Never";
}
