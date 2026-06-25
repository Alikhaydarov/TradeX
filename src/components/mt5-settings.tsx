"use client";

import { CheckCircle2, KeyRound, LoaderCircle, RefreshCw, Server, Unplug, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
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

type SyncResult = {
  imported: number;
  skipped: number;
  total: number;
  message?: string;
  error?: string;
};

export function Mt5Settings({ account, onSynced }: { account: PropAccount; onSynced: () => Promise<void> }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [login, setLogin]     = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer]   = useState("");
  const [metaApiConfigured, setMetaApiConfigured] = useState(false);
  const [busy, setBusy]       = useState<"save" | "sync" | "disconnect" | null>(null);
  const [message, setMessage] = useState("");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    apiRequest<{ connection: Connection | null; isVerified: boolean; metaApiConfigured: boolean }>(
      `/api/prop-accounts/${account.id}/mt5`
    ).then(({ connection: c, isVerified: v, metaApiConfigured: m }) => {
      setIsVerified(v); setMetaApiConfigured(m);
      if (!c) return;
      setConnection(c);
      setLogin(c.login ?? ""); setServer(c.server ?? "");
    }).catch(() => setIsVerified(false));
  }, [account.id]);

  const save = async () => {
    if (!login || !password || !server) { setMessage("Login, parol va server nomini kiriting."); return; }
    setBusy("save"); setMessage(""); setSyncResult(null);
    try {
      const { connection: c } = await apiRequest<{ connection: Connection; metaApiConfigured: boolean }>(
        `/api/prop-accounts/${account.id}/mt5`,
        { method: "PUT", body: JSON.stringify({ login, password, server }) }
      );
      setConnection(c);
      setPassword("");
      setMessage(metaApiConfigured
        ? "MT5 ulandi! Auto-sync yoqildi."
        : "Login ma'lumotlari saqlandi. METAAPI_TOKEN sozlansa auto-sync ishlaydi."
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Saqlanmadi.");
    } finally { setBusy(null); }
  };

  const sync = async () => {
    setBusy("sync"); setMessage(""); setSyncResult(null);
    try {
      const result = await apiRequest<SyncResult>(
        `/api/prop-accounts/${account.id}/mt5/sync`,
        { method: "POST" }
      );
      setSyncResult(result);
      if ((result.imported ?? 0) > 0) await onSynced();
      setConnection(c => c ? { ...c, last_synced_at: new Date().toISOString() } : c);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sync xato.");
    } finally { setBusy(null); }
  };

  const disconnect = async () => {
    if (!window.confirm("MT5 ulanishini o'chirasizmi?")) return;
    setBusy("disconnect"); setMessage("");
    try {
      await apiRequest(`/api/prop-accounts/${account.id}/mt5`, { method: "DELETE" });
      setConnection(null); setLogin(""); setPassword(""); setServer("");
      setSyncResult(null); setMessage("MT5 ajratildi.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Xato.");
    } finally { setBusy(null); }
  };

  const statusColor = (s?: string) => {
    if (s === "connected") return "text-emerald-400";
    if (s === "error") return "text-rose-400";
    return "text-zinc-500";
  };

  const lastSync = connection?.last_synced_at
    ? new Date(connection.last_synced_at).toLocaleString("uz-UZ")
    : null;

  return (
    <div className="space-y-4 px-4 pb-4">
      {/* Connection status bar */}
      {connection && (
        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
          connection.status === "connected"
            ? "border-emerald-500/20 bg-emerald-500/5"
            : connection.status === "error"
            ? "border-rose-500/20 bg-rose-500/5"
            : "border-[#2a2a2a] bg-[#1b1b1b]"
        }`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${connection.status === "connected" ? "bg-emerald-400" : connection.status === "error" ? "bg-rose-400 animate-pulse" : "bg-zinc-600"}`} />
              <span className={`text-xs font-semibold ${statusColor(connection.status)}`}>
                {connection.status === "connected" ? "Ulangan" : connection.status === "error" ? "Xato" : "Tayyor"}
              </span>
              <span className="text-xs text-zinc-600">·</span>
              <span className="truncate font-mono text-xs text-zinc-400">{connection.login} @ {connection.server}</span>
            </div>
            {lastSync && <p className="mt-0.5 text-[10px] text-zinc-600">So'nggi sync: {lastSync}</p>}
            {connection.last_error && <p className="mt-0.5 text-[10px] text-rose-500">{connection.last_error}</p>}
          </div>
          <div className="flex shrink-0 gap-2">
            {metaApiConfigured && (
              <button type="button" onClick={() => void sync()} disabled={busy === "sync"}
                className="flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/[.06] disabled:opacity-50">
                {busy === "sync"
                  ? <LoaderCircle size={12} className="animate-spin" />
                  : <RefreshCw size={12} />}
                Sync
              </button>
            )}
            <button type="button" onClick={() => void disconnect()} disabled={!!busy}
              className="grid h-7 w-7 place-items-center rounded-lg border border-[#2a2a2a] text-zinc-600 transition hover:border-rose-500/30 hover:text-rose-400">
              <Unplug size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Sync result */}
      {syncResult && (
        <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${
          syncResult.error ? "border-rose-500/20 bg-rose-500/5" : "border-emerald-500/20 bg-emerald-500/5"
        }`}>
          {syncResult.error
            ? <span className="text-xs text-rose-400">{syncResult.error}</span>
            : (
              <div className="text-xs">
                <CheckCircle2 size={14} className="mb-0.5 inline text-emerald-400" />
                {" "}
                <span className="font-semibold text-emerald-300">{syncResult.imported} ta trade</span>
                <span className="text-zinc-400"> import qilindi</span>
                {syncResult.skipped ? <span className="text-zinc-600"> ({syncResult.skipped} ta allaqachon bor edi)</span> : null}
                {syncResult.message ? <span className="text-zinc-500"> — {syncResult.message}</span> : null}
              </div>
            )
          }
        </div>
      )}

      {/* Credentials form */}
      <div className="space-y-3 rounded-xl border border-[#2a2a2a] bg-[#141414] p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">
          <KeyRound size={12} /> MT5 Credentials
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-[10px] font-semibold uppercase text-[#8a8a8a]">
              <UserRound size={10} /> Login
            </label>
            <input value={login} onChange={e => setLogin(e.target.value.replace(/\D/g, ""))}
              placeholder="12345678" inputMode="numeric"
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#0e0e0e] px-3 py-2 font-mono text-sm text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-white/20" />
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-[10px] font-semibold uppercase text-[#8a8a8a]">
              <KeyRound size={10} /> Parol
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="new-password"
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#0e0e0e] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-white/20" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-1 text-[10px] font-semibold uppercase text-[#8a8a8a]">
            <Server size={10} /> Broker Server
          </label>
          <input value={server} onChange={e => setServer(e.target.value)}
            placeholder="FTMODemo-Server3, ICMarketsEU-Live04 ..."
            className="w-full rounded-lg border border-[#2a2a2a] bg-[#0e0e0e] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-white/20" />
          <p className="text-[10px] text-zinc-700">MT5 → Tools → Options → Server</p>
        </div>

        <button type="button" onClick={() => void save()} disabled={!!busy}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-white text-xs font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50">
          {busy === "save" ? <LoaderCircle size={13} className="animate-spin" /> : <KeyRound size={13} />}
          {connection ? "Ma'lumotlarni yangilash" : "MT5 ulash va sync yoqish"}
        </button>
      </div>

      {!metaApiConfigured && (
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 px-4 py-3">
          <p className="text-xs font-semibold text-amber-400">Auto-sync hali sozlanmagan</p>
          <p className="mt-1 text-[11px] text-amber-600">
            Server admini <code className="rounded bg-black/30 px-1">METAAPI_TOKEN</code> env ga qo'shishi kerak. Login ma'lumotlari saqlanib turadi.
          </p>
        </div>
      )}

      {message && (
        <p className={`rounded-xl border px-3 py-2 text-xs ${
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
    </div>
  );
}
