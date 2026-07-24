"use client";

import { ExternalLink, FileSpreadsheet, FileUp, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { PlatformLogoBadge } from "./platform-logo-badge";
import type { PropAccount } from "./types";

export type AdditionalCsvPlatform = "ninjatrader" | "matchtrader" | "projectx";

type PlatformConfig = {
  name: string;
  reportName: string;
  description: string;
  openLabel: string;
  openUrl: string;
  steps: Array<[string, string]>;
};

const PLATFORM_CONFIG: Record<AdditionalCsvPlatform, PlatformConfig> = {
  ninjatrader: {
    name: "NinjaTrader",
    reportName: "Trade Performance CSV",
    description: "Import closed trades exported from the NinjaTrader Trade Performance window.",
    openLabel: "NinjaTrader help",
    openUrl: "https://support.ninjatrader.com/s/article/Trade-Performance-Window-NinjaTrader-Desktop?language=en_US",
    steps: [
      ["Open Trade Performance", "Control Center → New → Trade Performance."],
      ["Choose Trades", "Select the account, date range and Trades display."],
      ["Export the grid", "Export or save the closed-trades grid as CSV."],
    ],
  },
  matchtrader: {
    name: "MatchTrader",
    reportName: "Closed Positions CSV",
    description: "Import the Closed Positions CSV exported from MatchTrader.",
    openLabel: "Open MatchTrader",
    openUrl: "https://match-trader.com/",
    steps: [
      ["Open Closed Positions", "Open the trading-history Closed Positions tab."],
      ["Choose the range", "Apply the required account and date filters."],
      ["Export to CSV", "Use Export to CSV and select the file below."],
    ],
  },
  projectx: {
    name: "Project X",
    reportName: "Trades CSV",
    description: "Import a closed trades or day trades report from a ProjectX-based futures platform.",
    openLabel: "Open Project X",
    openUrl: "https://www.projectx.com/",
    steps: [
      ["Open trade history", "Open Trades, Day Trades or the performance report."],
      ["Choose the account", "Select the account and required trading dates."],
      ["Download CSV", "Export the report and select the CSV below."],
    ],
  },
};

type ImportResponse = {
  imported: number;
  scanned: number;
  skipped: number;
  duplicates: number;
};

export function PlatformCsvSettings({
  account,
  platform,
  onImported,
}: {
  account: PropAccount;
  platform: AdditionalCsvPlatform;
  onImported: () => Promise<void>;
}) {
  const config = PLATFORM_CONFIG[platform];
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const importCsv = async () => {
    if (!file || busy) return;
    setBusy(true);
    setMessage("");
    setSuccess(false);

    try {
      const form = new FormData();
      form.append("file", file);
      const response = await apiRequest<ImportResponse>(
        `/api/prop-accounts/${account.id}/csv/${platform}`,
        { method: "POST", body: form },
      );

      setSuccess(true);
      setMessage(
        response.imported > 0
          ? `${response.imported} new trades imported. ${response.duplicates} duplicate rows and ${response.skipped} invalid rows were ignored.`
          : `No new trades. ${response.duplicates} trades already existed and ${response.skipped} rows were ignored.`,
      );
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await onImported();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${config.name} CSV import failed.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-white/8 bg-[#070707] shadow-none">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <PlatformLogoBadge platform={platform} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-white">{config.name} Trade Import</h3>
                <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-amber-300">
                  CSV
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">{config.description}</p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="shrink-0 border-white/10 bg-[#0b0b0b]"
            onClick={() => window.open(config.openUrl, "_blank", "noopener,noreferrer")}
          >
            {config.openLabel} <ExternalLink size={15} />
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {config.steps.map(([title, text], index) => (
            <div key={title} className="rounded-xl border border-white/8 bg-black/40 p-3">
              <div className="flex items-start gap-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-white text-[10px] font-black text-black">
                  {index + 1}
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
            No trading password is stored. Duplicate trades are matched by platform trade ID or a stable row fingerprint.
          </p>
        </div>

        <label className="mt-5 block rounded-2xl border border-dashed border-white/12 bg-black/30 p-4 transition hover:border-white/25">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.07] text-zinc-300">
              <FileSpreadsheet size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{file ? file.name : `Select ${config.name} CSV`}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">{config.reportName} · maximum 10 MB</p>
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
            }}
            disabled={busy}
            className="mt-3 cursor-pointer border-white/10 bg-[#080808]"
          />
        </label>

        {message ? (
          <p className={`mt-4 rounded-xl border px-3 py-2.5 text-xs ${success ? "border-emerald-400/15 bg-emerald-400/[.055] text-emerald-200" : "border-rose-400/15 bg-rose-400/[.055] text-rose-200"}`}>
            {message}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            disabled={busy || !file}
            onClick={() => void importCsv()}
            className="bg-white text-black hover:bg-zinc-200"
          >
            {busy ? <LoaderCircle className="animate-spin" size={16} /> : <FileUp size={16} />}
            Import {config.name} trades
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
