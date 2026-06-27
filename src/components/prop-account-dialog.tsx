"use client";

import { KeyRound, LoaderCircle, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const PROP_FIRMS = ["FTMO", "The5ers", "FundedNext", "FundingPips", "Alpha Capital", "Other"];
const BROKERS = ["Exness", "IC Markets", "MetaTrader Broker", "Other"];
const MARKETS = ["CFD", "Futures"];
const SIZES = [10000, 25000, 50000, 100000, 200000];

const PLATFORM_BY_MARKET = {
  CFD: [
    { value: "mt5", label: "MT5", helper: "Auto import through MTAPI" },
    { value: "manual", label: "Manual", helper: "Journal only" },
  ],
  Futures: [
    { value: "tradovate", label: "Tradovate", helper: "Coming next" },
    { value: "ninjatrader", label: "NinjaTrader", helper: "Coming next" },
    { value: "manual", label: "Manual", helper: "Journal only" },
  ],
} as const;

export function PropAccountDialog({
  open, saving, onOpenChange, onSave,
}: {
  open: boolean;
  saving: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (f: FormData) => void | Promise<void>;
}) {
  const [accountType, setAccountType] = useState<"prop" | "real">("prop");
  const [firm, setFirm] = useState("FTMO");
  const [market, setMarket] = useState<"CFD" | "Futures">("CFD");
  const [platform, setPlatform] = useState("mt5");
  const [size, setSize] = useState(100000);
  const [connectNow, setConnectNow] = useState(true);

  const sources = accountType === "prop" ? PROP_FIRMS : BROKERS;
  const platformOptions = useMemo(() => PLATFORM_BY_MARKET[market], [market]);
  const importSource = platform === "mt5" ? "mtapi" : platform === "manual" ? "manual" : platform;
  const phase = accountType === "real" ? "Live" : "Challenge";

  function changeAccountType(next: "prop" | "real") {
    setAccountType(next);
    setFirm(next === "prop" ? "FTMO" : "Exness");
  }

  function changeMarket(next: "CFD" | "Futures") {
    setMarket(next);
    setPlatform(next === "CFD" ? "mt5" : "tradovate");
    setConnectNow(next === "CFD");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto border-[#2a2a2a] bg-[#111] p-0 sm:max-w-xl">
        <div className="border-b border-[#2a2a2a] px-5 py-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-white/[.06] text-zinc-300">
                <ShieldCheck size={19} />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold">Add account</DialogTitle>
                <p className="text-xs text-[#8a8a8a]">Clean setup now, details can be edited later.</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form action={onSave} className="space-y-4 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#2a2a2a] bg-[#1b1b1b] p-1">
            {(["prop", "real"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => changeAccountType(type)}
                className={`rounded-lg py-2 text-sm font-bold capitalize transition ${
                  accountType === type ? "bg-white text-black" : "text-[#8a8a8a] hover:text-zinc-100"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-[1.1fr_.9fr]">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Account name</Label>
              <Input
                name="name"
                placeholder={accountType === "prop" ? "FTMO 100K" : "Exness main"}
                required
                className="h-11 border-[#2a2a2a] bg-[#1b1b1b] focus:border-white/25"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">
                {accountType === "prop" ? "Firm" : "Broker"}
              </Label>
              <select
                value={firm}
                onChange={(event) => setFirm(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#2a2a2a] bg-[#1b1b1b] px-3 text-sm font-semibold text-zinc-100 outline-none focus:border-white/25"
              >
                {sources.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Market</Label>
              <div className="grid grid-cols-2 gap-2">
                {MARKETS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => changeMarket(item as "CFD" | "Futures")}
                    className={`rounded-xl border py-2.5 text-sm font-bold transition ${
                      market === item ? "border-white/25 bg-white/[.08] text-zinc-100" : "border-[#2a2a2a] bg-[#1b1b1b] text-[#8a8a8a]"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Size</Label>
              <select
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
                className="h-11 w-full rounded-xl border border-[#2a2a2a] bg-[#1b1b1b] px-3 font-mono text-sm font-bold text-zinc-100 outline-none focus:border-white/25"
              >
                {SIZES.map((item) => <option key={item} value={item}>${item.toLocaleString()}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Platform</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {platformOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setPlatform(item.value);
                    setConnectNow(item.value === "mt5");
                  }}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    platform === item.value ? "border-white/25 bg-white/[.08]" : "border-[#2a2a2a] bg-[#1b1b1b]"
                  }`}
                >
                  <span className="block text-sm font-bold text-zinc-100">{item.label}</span>
                  <span className="block text-[11px] text-[#8a8a8a]">{item.helper}</span>
                </button>
              ))}
            </div>
          </div>

          {platform === "mt5" ? (
            <div className="rounded-xl border border-[#2a2a2a] bg-[#1b1b1b] p-4">
              <button
                type="button"
                onClick={() => setConnectNow((value) => !value)}
                className="mb-3 flex w-full items-center justify-between text-left"
              >
                <span className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                  <KeyRound size={15} /> Connect MT5 now
                </span>
                <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                  connectNow ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-zinc-400"
                }`}>
                  {connectNow ? "On" : "Later"}
                </span>
              </button>

              {connectNow ? (
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      name="mt5Login"
                      placeholder="MT5 login"
                      inputMode="numeric"
                      autoComplete="off"
                      className="h-11 border-[#2a2a2a] bg-[#111] font-mono"
                    />
                    <Input
                      name="mt5Password"
                      type="password"
                      placeholder="Investor password"
                      autoComplete="new-password"
                      className="h-11 border-[#2a2a2a] bg-[#111]"
                    />
                  </div>
                  <Input
                    name="mt5Server"
                    placeholder="Exness-MT5Trial15"
                    autoComplete="off"
                    className="h-11 border-[#2a2a2a] bg-[#111]"
                  />
                  <p className="flex items-start gap-2 text-[11px] leading-5 text-[#8a8a8a]">
                    <Sparkles size={13} className="mt-0.5 shrink-0" />
                    TradeWay finds the MTAPI host automatically from the server name and imports closed history only.
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-300/15 bg-amber-300/[.06] p-3 text-xs leading-5 text-amber-100/80">
              {platform === "manual"
                ? "Manual account creates a clean journal without connector setup."
                : `${platformOptions.find((item) => item.value === platform)?.label} connector is planned next. This account will be manual until the connector is enabled.`}
            </div>
          )}

          <input type="hidden" name="accountType" value={accountType} />
          <input type="hidden" name="firm" value={firm} />
          <input type="hidden" name="propSite" value={accountType === "prop" ? firm : ""} />
          <input type="hidden" name="propLogin" value="" />
          <input type="hidden" name="phase" value={phase} />
          <input type="hidden" name="marketType" value={market} />
          <input type="hidden" name="platform" value={platform} />
          <input type="hidden" name="importSource" value={importSource} />
          <input type="hidden" name="accountSize" value={size} />
          <input type="hidden" name="initialBalance" value={size} />
          <input type="hidden" name="profitTarget" value={Math.round(size * 0.08)} />
          <input type="hidden" name="maxDrawdown" value={Math.round(size * 0.10)} />
          <input type="hidden" name="dailyDrawdown" value={Math.round(size * 0.05)} />
          <input type="hidden" name="startDate" value={new Date().toISOString().slice(0, 10)} />
          <input type="hidden" name="status" value="Active" />

          <Button disabled={saving} className="h-11 w-full bg-white font-semibold text-black hover:bg-zinc-200">
            {saving ? <LoaderCircle className="animate-spin" /> : <Plus size={18} />}
            Create account
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
