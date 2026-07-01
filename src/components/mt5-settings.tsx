"use client";

import { CheckCircle2, KeyRound, LoaderCircle, RefreshCw, Server, Unplug, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  imported?: number;
  journalImported?: number;
  skipped?: number;
  total?: number;
  queued?: boolean;
  immediate?: boolean;
  jobId?: string;
  message?: string;
  error?: string;
};

function asCount(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function postSyncWithTimeout(url: string): Promise<SyncResult> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 55_000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    const text = await response.text();
    let payload: SyncResult = {};
    try {
      payload = text ? JSON.parse(text) as SyncResult : {};
    } catch {
      payload = { error: text || "Sync server javobi noto'g'ri formatda." };
    }
    if (!response.ok) {
      throw new Error(payload.error || payload.message || `Sync xato (${response.status}).`);
    }
    return payload;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function SyncDot({ active, done, label }: { active?: boolean; done?: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
      done
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
        : active
          ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
          : "border-white/10 bg-white/[.03] text-zinc-500"
    }`}>
      {active ? <LoaderCircle size={10} className="animate-spin" /> : done ? <CheckCircle2 size={10} /> : <span className="size-1.5 rounded-full bg-current opacity-60" />}
      {label}
    </span>
  );
}

export function Mt5Settings({ account, onSynced }: { account: PropAccount; onSynced: () => Promise<void> }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("");
  const [bridgeConfigured, setBridgeConfigured] = useState(false);
  const [busy, setBusy] = useState<"save" | "sync" | "disconnect" | null>(null);
  const [message, setMessage] = useState("");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [polling, setPolling] = useState(false);
  const [syncStartedAt, setSyncStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const pollToken = useRef(0);

  useEffect(() => {
    apiRequest<{ connection: Connection | null; isVerified: boolean; bridgeConfigured: boolean }>(
      `/api/prop-accounts/${account.id}/mt5`
    ).then(({ connection: c, isVerified: v, bridgeConfigured: m }) => {
      setIsVerified(v); setBridgeConfigured(m);
      if (!c) return;
      setConnection(c);
      setLogin(c.login ?? "");
      setServer(c.server ?? "");
    }).catch(() => setIsVerified(false));
  }, [account.id]);

  useEffect(() => () => { pollToken.current += 1; }, []);

  useEffect(() => {
    if (!syncStartedAt || (!busy && !polling)) {
      setElapsedSeconds(0);
      return undefined;
    }
    const id = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - syncStartedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [busy, polling, syncStartedAt]);

  const importedCount = asCount(syncResult?.imported);
  const journalCount = asCount(syncResult?.journalImported);
  const skippedCount = asCount(syncResult?.skipped);
  const checkedCount = asCount(syncResult?.total);
  const syncInProgress = busy === "sync" || polling;

  const syncStatus = useMemo(() => {
    if (busy === "sync") {
      if (elapsedSeconds < 8) return "VPS sync chaqirilyapti";
      if (elapsedSeconds < 30) return "MT5 history tekshirilyapti";
      return "Journal javobi kutilmoqda";
    }
    if (polling) return "Journal avtomatik yangilanmoqda";
    return "Tezkor sync tayyor";
  }, [busy, elapsedSeconds, polling]);

  const pollJournal = async () => {
    const token = pollToken.current + 1;
    pollToken.current = token;
    setPolling(true);
    try {
      for (let attempt = 1; attempt <= 18; attempt += 1) {
        await wait(attempt === 1 ? 3000 : 5000);
        if (pollToken.current !== token) return;
        await onSynced();
      }
      if (pollToken.current === token) {
        setMessage("Journal 90 sekund tekshirildi. Trade ko'rinmasa, MT5 terminal history hali yangilanmagan yoki VPS auto-sync kutyapti.");
      }
    } catch (e) {
      if (pollToken.current === token) {
        setMessage(e instanceof Error ? e.message : "Journal refresh xato.");
      }
    } finally {
      if (pollToken.current === token) setPolling(false);
    }
  };

  const save = async () => {
    if (!login || !password || !server) {
      setMessage("Login, parol va server nomini kiriting.");
      return;
    }
    setBusy("save");
    setMessage("");
    setSyncResult(null);
    try {
      const { connection: c } = await apiRequest<{ connection: Connection; bridgeConfigured: boolean }>(
        `/api/prop-accounts/${account.id}/mt5`,
        { method: "PUT", body: JSON.stringify({ login, password, server }) }
      );
      setConnection(c);
      setPassword("");
      setMessage("MT5 ma'lumotlari saqlandi. Endi Sync tugmasi shu account uchun ishlaydi.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Saqlanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    pollToken.current += 1;
    setPolling(false);
    setSyncStartedAt(Date.now());
    setBusy("sync");
    setMessage("");
    setSyncResult(null);
    try {
      let result: SyncResult;
      try {
        result = await postSyncWithTimeout(`/api/prop-accounts/${account.id}/mt5/sync`);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          result = {
            queued: true,
            imported: 0,
            skipped: 0,
            total: 0,
            message: "Sync 55 sekunddan oshdi. Tugma qotmaydi — journal avtomatik tekshirilyapti.",
          };
        } else {
          throw e;
        }
      }

      setSyncResult(result);
      await onSynced();
      setConnection(c => c ? { ...c, last_synced_at: new Date().toISOString() } : c);

      const imported = asCount(result.imported) + asCount(result.journalImported);
      if (result.queued || imported === 0) {
        void pollJournal();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sync xato.");
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("MT5 ulanishini o'chirasizmi?")) return;
    setBusy("disconnect");
    setMessage("");
    try {
      await apiRequest(`/api/prop-accounts/${account.id}/mt5`, { method: "DELETE" });
      setConnection(null);
      setLogin("");
      setPassword("");
      setServer("");
      setSyncResult(null);
      setMessage("MT5 ajratildi.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Xato.");
    } finally {
      setBusy(null);
    }
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
    <div className="space-y-3 px-3 pb-4 sm:space-y-4 sm:px-4">
      {connection && (
        <div className={`rounded-2xl border p-3 text-sm sm:p-4 ${
          connection.status === "connected"
            ? "border-emerald-500/20 bg-emerald-500/5"
            : connection.status === "error"
              ? "border-rose-500/20 bg-rose-500/5"
              : "border-[#2a2a2a] bg-[#1b1b1b]"
        }`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${connection.status === "connected" ? "bg-emerald-400" : connection.status === "error" ? "animate-pulse bg-rose-400" : "bg-zinc-600"}`} />
                <span className={`text-xs font-semibold ${statusColor(connection.status)}`}>
                  {connection.status === "connected" ? "Ulangan" : connection.status === "error" ? "Xato" : "Tayyor"}
                </span>
                <span className="hidden text-xs text-zinc-600 sm:inline">·</span>
                <span className="max-w-full truncate font-mono text-[11px] text-zinc-400 sm:text-xs">{connection.login} @ {connection.server}</span>
              </div>
              {lastSync && <p className="text-[10px] text-zinc-600">So'nggi sync: {lastSync}</p>}
              {connection.last_error && <p className="break-words text-[10px] text-rose-500">{connection.last_error}</p>}
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:shrink-0">
              <button type="button" onClick={() => void sync()} disabled={syncInProgress}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#2a2a2a] px-3 text-xs font-bold text-zinc-200 transition hover:bg-white/[.06] disabled:opacity-60 sm:h-8 sm:min-w-28">
                {syncInProgress ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {polling ? "Tekshirilmoqda" : busy === "sync" ? "Sync..." : "Sync"}
              </button>
              <button type="button" onClick={() => void disconnect()} disabled={!!busy}
                className="grid h-10 w-10 place-items-center rounded-xl border border-[#2a2a2a] text-zinc-600 transition hover:border-rose-500/30 hover:text-rose-400 sm:h-8 sm:w-8">
                <Unplug size={13} />
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Fast sync status</p>
                <p className="mt-0.5 text-xs font-semibold text-zinc-200">{syncStatus}</p>
              </div>
              {syncInProgress ? <p className="font-mono text-[11px] text-amber-300">{elapsedSeconds}s</p> : <p className="text-[11px] text-zinc-600">Target: 5–30s</p>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <SyncDot label="VPS" done={!!syncResult && !syncResult.error} active={busy === "sync" && elapsedSeconds < 8} />
              <SyncDot label="MT5 history" done={importedCount > 0 || journalCount > 0} active={busy === "sync" && elapsedSeconds >= 8} />
              <SyncDot label="Journal" done={journalCount > 0} active={polling} />
            </div>
          </div>
        </div>
      )}

      {syncResult && (
        <div className={`rounded-2xl border px-3 py-3 sm:px-4 ${
          syncResult.error
            ? "border-rose-500/20 bg-rose-500/5"
            : syncResult.queued || polling
              ? "border-amber-500/20 bg-amber-500/5"
              : importedCount > 0
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-zinc-500/20 bg-zinc-500/5"
        }`}>
          {syncResult.error
            ? <p className="break-words text-xs text-rose-400">{syncResult.error}</p>
            : syncResult.queued
              ? (
                <div className="text-xs leading-5">
                  <LoaderCircle size={14} className="mb-0.5 inline animate-spin text-amber-400" />{" "}
                  <span className="font-semibold text-amber-300">Sync navbatga qo'yildi.</span>
                  <span className="text-zinc-400"> Journal avtomatik tekshirilyapti.</span>
                  {syncResult.message ? <span className="break-words text-zinc-500"> — {syncResult.message}</span> : null}
                </div>
              )
              : importedCount > 0
                ? (
                  <div className="text-xs leading-5">
                    <CheckCircle2 size={14} className="mb-0.5 inline text-emerald-400" />{" "}
                    <span className="font-semibold text-emerald-300">{importedCount} ta trade</span>
                    <span className="text-zinc-400"> import qilindi</span>
                    {journalCount ? <span className="text-zinc-500"> · {journalCount} ta journalga saqlandi</span> : null}
                    {checkedCount ? <span className="text-zinc-600"> · {checkedCount} ta MT5 trade tekshirildi</span> : null}
                    {skippedCount ? <span className="text-zinc-600"> · {skippedCount} ta skip</span> : null}
                    {syncResult.message ? <span className="break-words text-zinc-500"> — {syncResult.message}</span> : null}
                  </div>
                )
                : polling
                  ? (
                    <div className="text-xs leading-5">
                      <LoaderCircle size={14} className="mb-0.5 inline animate-spin text-amber-400" />{" "}
                      <span className="font-semibold text-amber-300">MT5 history tekshirilyapti.</span>
                      <span className="text-zinc-400"> Trade kelishi bilan journal yangilanadi.</span>
                      {syncResult.message ? <span className="break-words text-zinc-500"> — {syncResult.message}</span> : null}
                    </div>
                  )
                  : (
                    <div className="text-xs leading-5">
                      <CheckCircle2 size={14} className="mb-0.5 inline text-zinc-400" />{" "}
                      <span className="font-semibold text-zinc-300">Yangi trade topilmadi.</span>
                      {checkedCount ? <span className="text-zinc-500"> {checkedCount} ta MT5 trade tekshirildi.</span> : null}
                      {syncResult.message ? <span className="break-words text-zinc-500"> — {syncResult.message}</span> : null}
                    </div>
                  )
          }
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
            <input value={login} onChange={e => setLogin(e.target.value.replace(/\D/g, ""))}
              placeholder="12345678" inputMode="numeric"
              className="h-10 w-full rounded-xl border border-[#2a2a2a] bg-[#0e0e0e] px-3 font-mono text-sm text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-white/20" />
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-[10px] font-semibold uppercase text-[#8a8a8a]">
              <KeyRound size={10} /> Parol
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="new-password"
              className="h-10 w-full rounded-xl border border-[#2a2a2a] bg-[#0e0e0e] px-3 text-sm text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-white/20" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-1 text-[10px] font-semibold uppercase text-[#8a8a8a]">
            <Server size={10} /> Broker Server
          </label>
          <input value={server} onChange={e => setServer(e.target.value)}
            placeholder="Exness-MT5Trial, ICMarketsEU-Live04 ..."
            className="h-10 w-full rounded-xl border border-[#2a2a2a] bg-[#0e0e0e] px-3 text-sm text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-white/20" />
          <p className="text-[10px] text-zinc-700">MT5 → Tools → Options → Server</p>
        </div>

        <button type="button" onClick={() => void save()} disabled={!!busy}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white text-xs font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50">
          {busy === "save" ? <LoaderCircle size={13} className="animate-spin" /> : <KeyRound size={13} />}
          {connection ? "Ma'lumotlarni yangilash" : "MT5 ulash va sync yoqish"}
        </button>
      </div>

      {!bridgeConfigured && (
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 px-3 py-3 sm:px-4">
          <p className="text-xs font-semibold text-amber-400">MT5 bridge is not configured</p>
          <p className="mt-1 break-words text-[11px] leading-5 text-amber-600">
            Credentials are saved, but live history import needs <code className="rounded bg-black/30 px-1">MT5_BRIDGE_URL</code> and <code className="rounded bg-black/30 px-1">MT5_BRIDGE_TOKEN</code>.
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
    </div>
  );
}
