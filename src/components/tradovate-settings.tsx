"use client";

import {
  CircleCheck,
  Link2,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { PlatformLogoBadge } from "./platform-logo-badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import type { PropAccount } from "./types";

type TradovateStatus = {
  configured: boolean;
  connected: boolean;
  connection: {
    tradovate_account_id: number | null;
    tradovate_account_name: string | null;
    environment: "live" | "demo";
    status: "connected" | "error" | "disconnected";
    last_synced_at: string | null;
    last_error: string | null;
    expires_at: string | null;
    updated_at: string | null;
  } | null;
};

function dateTime(value?: string | null) {
  if (!value) return "Not synced yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not synced yet" : date.toLocaleString();
}

export function TradovateSettings({
  account,
  onSynced,
}: {
  account: PropAccount;
  onSynced: () => Promise<void>;
}) {
  const [status, setStatus] = useState<TradovateStatus | null>(null);
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(null);
  const [message, setMessage] = useState("");
  const autoConnectAttempted = useRef(false);

  const loadStatus = useCallback(async () => {
    try {
      const response = await apiRequest<TradovateStatus>(
        `/api/prop-accounts/${account.id}/tradovate/status`,
      );
      setStatus(response);
      return response;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tradovate status could not be loaded.");
      return null;
    }
  }, [account.id]);

  const connect = useCallback(async () => {
    setBusy("connect");
    setMessage("");
    try {
      const response = await apiRequest<{ url: string }>(
        `/api/prop-accounts/${account.id}/tradovate/connect`,
        { method: "POST" },
      );
      window.location.assign(response.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tradovate connection failed.");
      setBusy(null);
    }
  }, [account.id]);

  useEffect(() => {
    void loadStatus().then((response) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (params.get("tradovate") === "connected") {
        setMessage("Tradovate connected. Trade history is ready to sync.");
      } else if (params.get("tradovate") === "error") {
        setMessage("Tradovate authorization was not completed. Try connecting again.");
      }

      if (
        params.get("connect") === "tradovate" &&
        response?.configured &&
        !response.connected &&
        !autoConnectAttempted.current
      ) {
        autoConnectAttempted.current = true;
        void connect();
      }
    });
  }, [connect, loadStatus]);

  const sync = async () => {
    setBusy("sync");
    setMessage("");
    try {
      const response = await apiRequest<{ imported: number; scanned: number }>(
        `/api/prop-accounts/${account.id}/tradovate/sync`,
        { method: "POST" },
      );
      setMessage(
        response.imported
          ? `Imported ${response.imported} new trades from ${response.scanned} closed Tradovate trades.`
          : `Tradovate is up to date. ${response.scanned} closed trades were checked.`,
      );
      await Promise.all([loadStatus(), onSynced()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tradovate sync failed.");
      await loadStatus();
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect Tradovate from this account? Imported journal trades will stay saved.")) {
      return;
    }

    setBusy("disconnect");
    setMessage("");
    try {
      await apiRequest(`/api/prop-accounts/${account.id}/tradovate/status`, {
        method: "DELETE",
      });
      setMessage("Tradovate disconnected. Existing imported trades were kept.");
      await Promise.all([loadStatus(), onSynced()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tradovate could not be disconnected.");
    } finally {
      setBusy(null);
    }
  };

  const connection = status?.connection;

  return (
    <Card className="border-white/8 bg-[#070707] shadow-none">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <PlatformLogoBadge platform="tradovate" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-white">Tradovate Futures Sync</h3>
                {status?.connected ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                    <CircleCheck size={11} /> Connected
                  </span>
                ) : null}
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">
                Authorize Tradox with Tradovate OAuth. Your Tradovate password is never entered or stored in Tradox.
              </p>
            </div>
          </div>

          {status?.connected ? (
            <Button
              type="button"
              onClick={() => void sync()}
              disabled={Boolean(busy)}
              className="shrink-0 bg-white text-black hover:bg-zinc-200"
            >
              {busy === "sync" ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              Sync trades
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void connect()}
              disabled={Boolean(busy) || status?.configured === false}
              className="shrink-0 bg-white text-black hover:bg-zinc-200"
            >
              {busy === "connect" ? <LoaderCircle className="animate-spin" size={16} /> : <Link2 size={16} />}
              Connect Tradovate
            </Button>
          )}
        </div>

        {status?.configured === false ? (
          <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/[.06] p-3 text-xs leading-5 text-amber-100/80">
            Tradovate OAuth credentials are not configured on the server. Add the Tradovate client ID, client secret and redirect URI before connecting.
          </div>
        ) : null}

        {connection ? (
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Info label="Tradovate account" value={connection.tradovate_account_name || String(connection.tradovate_account_id || "-")} />
            <Info label="Environment" value={connection.environment.toUpperCase()} />
            <Info label="Last sync" value={dateTime(connection.last_synced_at)} />
          </div>
        ) : null}

        {connection?.last_error ? (
          <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/[.06] px-3 py-2 text-xs text-rose-200">
            {connection.last_error}
          </p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[.035] px-3 py-2 text-xs text-zinc-300">
            {message}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex max-w-xl items-start gap-2 text-[11px] leading-5 text-zinc-500">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" />
            Read-only authorization is used to import account and closed-trade history. Tradox does not place, modify or close trades.
          </p>
          {status?.connected ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void disconnect()}
              disabled={Boolean(busy)}
              className="shrink-0 border-white/10 text-zinc-300"
            >
              {busy === "disconnect" ? <LoaderCircle className="animate-spin" size={16} /> : <Unplug size={16} />}
              Disconnect
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/8 bg-[#050505] p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-zinc-200">{value}</p>
    </div>
  );
}
