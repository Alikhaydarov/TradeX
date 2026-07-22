"use client";

import { FileUp, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import type { PropAccount } from "./types";

export function CTraderSettings({ account, onImported }: { account: PropAccount; onImported: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const importCsv = async () => {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await apiRequest<{ imported: number; scanned: number }>(`/api/prop-accounts/${account.id}/ctrader/import`, {
        method: "POST",
        body: form,
      });
      setMessage(`Imported ${response.imported} new trades from ${response.scanned} cTrader rows.`);
      setFile(null);
      await onImported();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "cTrader import failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-zinc-200">
            <FileUp size={19} />
          </span>
          <div>
            <h3 className="font-black">cTrader Trade Import</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Export closed cTrader history/deals as CSV, then upload it here. Imported rows are matched by position/deal ID to avoid duplicates.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-emerald-400/15 bg-emerald-400/[.055] p-3 text-[11px] leading-5 text-emerald-50/80">
          <p className="flex items-start gap-2">
            <ShieldCheck size={13} className="mt-0.5 shrink-0" />
            Current active flow is cTrader CSV import. Full OAuth auto-sync can be added after cTrader Open API app credentials are ready.
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            disabled={busy}
            className="cursor-pointer"
          />
          {file ? <p className="text-xs text-zinc-500">Selected: {file.name}</p> : null}
        </div>

        {message ? <p className="mt-4 rounded-xl border border-white/10 bg-muted/30 px-3 py-2 text-xs text-zinc-300">{message}</p> : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button disabled={busy || !file} onClick={() => void importCsv()}>
            {busy ? <LoaderCircle className="animate-spin" size={16} /> : <FileUp size={16} />}
            Import cTrader CSV
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => void onImported()}>
            <RefreshCw size={16} /> Refresh journal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
