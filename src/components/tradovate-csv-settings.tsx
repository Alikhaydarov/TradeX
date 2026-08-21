"use client";

import { ExternalLink, FileSpreadsheet, FileUp, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { PlatformLogoBadge } from "./platform-logo-badge";
import type { PropAccount } from "./types";

type ImportResponse = {
  imported: number;
  scanned: number;
  skipped: number;
  duplicates: number;
  headerRows?: number;
};

type ImportResult = ImportResponse & { fileName: string };

export function TradovateCsvSettings({
  account,
  onImported,
}: {
  account: PropAccount;
  onImported: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importCsv = async () => {
    if (!file || busy) return;
    const fileName = file.name;
    setBusy(true);
    setMessage("");
    setSuccess(false);
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const response = await apiRequest<ImportResponse>(
        `/api/prop-accounts/${account.id}/tradovate/import`,
        { method: "POST", body: form },
      );

      setSuccess(true);
      setResult({ ...response, fileName });
      setMessage(
        response.imported > 0
          ? `${response.imported} new trades imported from ${response.scanned} data rows.`
          : `The CSV was read successfully, but no new trades were added. ${response.duplicates} trades already existed.`,
      );
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await onImported();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tradovate CSV import failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-white/8 bg-surface shadow-none">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <PlatformLogoBadge platform="tradovate" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-white">Tradovate Position History Import</h3>
                <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-amber-300">
                  CSV
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">
                Daily and monthly Position History reports are supported. The importer finds the trade header even when report information appears above it.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="shrink-0 border-white/10 bg-surface"
            onClick={() => window.open("https://trader.tradovate.com/", "_blank", "noopener,noreferrer")}
          >
            Open Tradovate <ExternalLink size={15} />
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {[
            ["1", "Open Reports", "Use the account menu or margin section."],
            ["2", "Position History", "Choose the account and daily or monthly date range."],
            ["3", "Download report", "Download CSV, then select it below."],
          ].map(([number, title, text]) => (
            <div key={number} className="rounded-xl border border-white/8 bg-black/40 p-3">
              <div className="flex items-start gap-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-white text-[10px] font-black text-black">
                  {number}
                </span>
                <div>
                  <p className="text-xs font-black text-white">{title}</p>
                  <p className="mt-1 text-[10px] leading-4 text-zinc-500">{text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-emerald-400/15 bg-emerald-400/[.055] p-3 text-[11px] leading-5 text-emerald-50/80">
          <p className="flex items-start gap-2">
            <ShieldCheck size={13} className="mt-0.5 shrink-0" />
            UTF-8, UTF-16, comma, semicolon and tab-separated CSV reports are supported. Duplicate trades are ignored automatically.
          </p>
        </div>

        <label className="mt-5 block rounded-2xl border border-dashed border-white/12 bg-black/30 p-4 transition hover:border-white/25">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.07] text-zinc-300">
              <FileSpreadsheet size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {file ? file.name : "Select Tradovate CSV"}
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-500">
                Position History report · daily or monthly · maximum 10 MB
              </p>
            </div>
          </div>
          <Input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setMessage("");
              setSuccess(false);
              setResult(null);
            }}
            disabled={busy}
            className="mt-3 cursor-pointer border-white/10 bg-surface"
          />
        </label>

        {message ? (
          <div
            className={`mt-4 rounded-xl border px-3 py-3 text-xs ${
              success
                ? "border-emerald-400/15 bg-emerald-400/[.055] text-emerald-200"
                : "border-rose-400/15 bg-rose-400/[.055] text-rose-200"
            }`}
          >
            <p>{message}</p>
            {result ? (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ImportStat label="Scanned" value={result.scanned} />
                <ImportStat label="Imported" value={result.imported} />
                <ImportStat label="Duplicates" value={result.duplicates} />
                <ImportStat label="Invalid" value={result.skipped} />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            disabled={busy || !file}
            onClick={() => void importCsv()}
            className="bg-white text-black hover:bg-zinc-200"
          >
            {busy ? <LoaderCircle className="animate-spin" size={16} /> : <FileUp size={16} />}
            Import Position History
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ImportStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/30 px-2.5 py-2">
      <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-black text-white">{value}</p>
    </div>
  );
}
