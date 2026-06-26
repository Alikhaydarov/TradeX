"use client";
import { ChevronDown, KeyRound, LoaderCircle, Plus, ShieldCheck, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const FIRMS = [
  { name: "FTMO", mark: "FT", color: "#e9ff2f", text: "#000" },
  { name: "The5ers", mark: "5%", color: "#ff5a36", text: "#fff" },
  { name: "FundedNext", mark: "FN", color: "#7457ff", text: "#fff" },
  { name: "FundingPips", mark: "FP", color: "#12c98d", text: "#06261c" },
  { name: "Alpha Capital", mark: "AC", color: "#2672ff", text: "#fff" },
  { name: "Other", mark: "OT", color: "#333333", text: "#f1f1f1" },
];

const BROKERS = [
  { name: "MetaTrader Broker", mark: "MT", color: "#2b7fff", text: "#fff" },
  { name: "Exness", mark: "EX", color: "#f6d33d", text: "#111" },
  { name: "IC Markets", mark: "IC", color: "#111827", text: "#fff" },
  { name: "Other", mark: "OT", color: "#333333", text: "#f1f1f1" },
];

const PHASES = ["Challenge", "Verification", "Funded", "Live"];
const MARKETS = ["CFD", "Futures", "Crypto", "Forex"];
const SIZES = [5000, 10000, 25000, 50000, 100000, 200000];
const IMPORT_SOURCES = [
  { value: "manual", label: "Manual journal", helper: "Add or review trades inside TradeWay." },
  { value: "mt5_bridge", label: "MT5 Bridge", helper: "Read-only closed trade history import through your MT5 bridge." },
  { value: "ctrader", label: "cTrader Open API", helper: "Prepared for firms that give cTrader access." },
  { value: "tradovate", label: "Tradovate", helper: "Futures history connector placeholder." },
  { value: "ninjatrader", label: "NinjaTrader", helper: "Futures broker/platform connector placeholder." },
  { value: "official_api", label: "Official prop API", helper: "Use only when a prop firm provides a real API." },
];

const CFD_PLATFORMS = [
  { value: "mt5", label: "MT5" },
  { value: "ctrader", label: "cTrader" },
  { value: "manual", label: "Manual" },
];

const FUTURES_PLATFORMS = [
  { value: "tradovate", label: "Tradovate" },
  { value: "ninjatrader", label: "NinjaTrader" },
  { value: "manual", label: "Manual" },
];

export function PropAccountDialog({
  open, saving, onOpenChange, onSave,
}: {
  open: boolean; saving: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (f: FormData) => void | Promise<void>;
}) {
  const [firm, setFirm] = useState("FTMO");
  const [accountType, setAccountType] = useState<"prop" | "real">("prop");
  const [phase, setPhase] = useState("Challenge");
  const [market, setMarket] = useState("CFD");
  const [size, setSize] = useState(100000);
  const [platform, setPlatform] = useState("mt5");
  const [importSource, setImportSource] = useState("manual");
  const [propLogin, setPropLogin] = useState("");
  const [firmOpen, setFirmOpen] = useState(false);
  const [mt5Open, setMt5Open] = useState(false);
  const [mt5Login, setMt5Login] = useState("");
  const [mt5Password, setMt5Password] = useState("");
  const [mt5Server, setMt5Server] = useState("");
  const sourceList = accountType === "prop" ? FIRMS : BROKERS;
  const selectedFirm = sourceList.find(f => f.name === firm) || sourceList[sourceList.length - 1];
  const platformOptions = useMemo(() => market === "Futures" ? FUTURES_PLATFORMS : CFD_PLATFORMS, [market]);
  const importOptions = useMemo(() => {
    if (market === "Futures") return IMPORT_SOURCES.filter((source) => ["manual", "tradovate", "ninjatrader", "official_api"].includes(source.value));
    return IMPORT_SOURCES.filter((source) => ["manual", "metaapi", "ctrader", "official_api"].includes(source.value));
  }, [market]);

  useEffect(() => {
    if (!platformOptions.some((option) => option.value === platform)) setPlatform(platformOptions[0].value);
    if (!importOptions.some((option) => option.value === importSource)) setImportSource(importOptions[0].value);
  }, [importOptions, importSource, platform, platformOptions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto border-[#2a2a2a] bg-[#111] p-0 sm:max-w-2xl">
        <div className="relative overflow-hidden border-b border-[#2a2a2a] px-5 py-4">
          <DialogHeader className="relative">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-white/[.06] text-zinc-300">
                <ShieldCheck size={20} />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold">Add trading account</DialogTitle>
                <p className="text-xs text-[#8a8a8a]">Prop or real account. CFD and Futures ready.</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form action={onSave} className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[.8fr_1.2fr]">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Account type</Label>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#2a2a2a] bg-[#1b1b1b] p-1.5">
              {(["prop", "real"] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setAccountType(type);
                    setFirm(type === "prop" ? "FTMO" : "MetaTrader Broker");
                    setPhase(type === "prop" ? "Challenge" : "Live");
                  }}
                  className={`rounded-lg py-2 text-sm font-bold capitalize transition ${accountType === type ? "bg-white/[.10] text-zinc-100" : "text-[#8a8a8a] hover:text-[#f1f1f1]"}`}
                >
                  {type}
                </button>
              ))}
            </div>
            <input type="hidden" name="accountType" value={accountType} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">{accountType === "prop" ? "Prop firm" : "Broker / source"}</Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setFirmOpen(v => !v)}
                className="flex w-full items-center gap-3 rounded-xl border border-[#2a2a2a] bg-[#1b1b1b] px-4 py-3 text-left transition hover:border-white/20"
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-xs font-black"
                  style={{ background: selectedFirm.color, color: selectedFirm.text }}
                >
                  {selectedFirm.mark}
                </span>
                <span className="flex-1 font-medium">{firm}</span>
                <ChevronDown size={16} className={`text-[#8a8a8a] transition-transform ${firmOpen ? "rotate-180" : ""}`} />
              </button>
              {firmOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-[#2a2a2a] bg-[#181818] shadow-2xl">
                  {sourceList.map(f => (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => { setFirm(f.name); setFirmOpen(false); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#242424] first:rounded-t-xl last:rounded-b-xl"
                    >
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-black"
                        style={{ background: f.color, color: f.text }}
                      >
                        {f.mark}
                      </span>
                      <span className={firm === f.name ? "font-bold text-zinc-300" : ""}>{f.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input type="hidden" name="firm" value={firm} />
            <input type="hidden" name="propSite" value={accountType === "prop" ? firm : ""} />
          </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1.2fr_.8fr]">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Account name</Label>
            <Input
              name="name"
              placeholder={accountType === "prop" ? "FTMO 100K #1" : "Main MT5 account"}
              required
              className="border-[#2a2a2a] bg-[#1b1b1b] focus:border-white/25"
            />
          </div>

          {accountType === "prop" ? (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Prop account ID</Label>
              <Input
                value={propLogin}
                onChange={(event) => setPropLogin(event.target.value)}
                name="propLogin"
                placeholder="Optional dashboard or challenge ID"
                className="border-[#2a2a2a] bg-[#1b1b1b] focus:border-white/25"
              />
              <p className="text-[11px] leading-5 text-[#8a8a8a]">
                Prop dashboard password is not stored.
              </p>
            </div>
          ) : <input type="hidden" name="propLogin" value="" />}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Stage</Label>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#2a2a2a] bg-[#1b1b1b] p-1.5">
                {PHASES.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPhase(p)}
                    className={`rounded-lg py-1.5 text-xs font-medium transition ${phase === p ? "bg-white/[.10] text-zinc-300" : "text-[#8a8a8a] hover:text-[#f1f1f1]"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input type="hidden" name="phase" value={phase} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Market</Label>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#2a2a2a] bg-[#1b1b1b] p-1.5">
                {MARKETS.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMarket(m);
                      if (m === "Futures") {
                        setPlatform("tradovate");
                        setImportSource("manual");
                      } else {
                        setPlatform("mt5");
                        setImportSource("manual");
                      }
                    }}
                    className={`rounded-lg py-1.5 text-xs font-medium transition ${market === m ? "bg-white/[.10] text-zinc-300" : "text-[#8a8a8a] hover:text-[#f1f1f1]"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <input type="hidden" name="marketType" value={market} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[.9fr_1.1fr]">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Account size</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {SIZES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`rounded-xl border py-2.5 text-sm font-bold transition ${size === s ? "border-white/25 bg-white/[.06] text-zinc-300" : "border-[#2a2a2a] bg-[#1b1b1b] text-[#8a8a8a] hover:border-[#263553] hover:text-[#f1f1f1]"}`}
                >
                  ${(s / 1000).toFixed(0)}K
                </button>
              ))}
            </div>
            <input type="hidden" name="accountSize" value={size} />
            <input type="hidden" name="initialBalance" value={size} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Import route</Label>
            <div className="grid gap-1.5">
              {importOptions.map(source => (
                <button
                  key={source.value}
                  type="button"
                  onClick={() => setImportSource(source.value)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition ${importSource === source.value ? "border-white/25 bg-white/[.07]" : "border-[#2a2a2a] bg-[#1b1b1b] hover:border-white/15"}`}
                >
                  <span>
                    <span className="block text-sm font-bold text-zinc-100">{source.label}</span>
                    <span className="block text-[11px] leading-4 text-[#8a8a8a]">{source.helper}</span>
                  </span>
                  <span className={`size-2 rounded-full ${importSource === source.value ? "bg-emerald-300" : "bg-white/10"}`} />
                </button>
              ))}
            </div>
            <input type="hidden" name="importSource" value={importSource} />
          </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Platform</Label>
            <div className="grid grid-cols-3 gap-2">
              {platformOptions.map(item => (
                <button key={item.value} type="button" onClick={() => setPlatform(item.value)} className={`rounded-xl border py-2.5 text-xs font-bold transition ${platform === item.value ? "border-white/25 bg-white/[.06] text-zinc-100" : "border-[#2a2a2a] bg-[#1b1b1b] text-[#8a8a8a] hover:border-white/15"}`}>
                  {item.label}
                </button>
              ))}
            </div>
            <input type="hidden" name="platform" value={platform} />
          </div>

          <div className="rounded-xl border border-[#2a2a2a] bg-[#1b1b1b] p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">
              <TrendingUp size={13} /> Risk limits
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Profit target", "profitTarget", Math.round(size * 0.08)],
                ["Max drawdown", "maxDrawdown", Math.round(size * 0.10)],
                ["Daily limit", "dailyDrawdown", Math.round(size * 0.05)],
              ].map(([label, name, def]) => (
                <div key={String(name)} className="space-y-1.5">
                  <label className="text-[10px] text-[#8a8a8a]">{label}</label>
                  <Input
                    name={String(name)}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    defaultValue={String(def)}
                    onChange={(e) => { e.target.value = e.target.value.replace(",", ".").replace(/[^0-9.]/g, ""); }}
                    required
                    className="h-9 border-[#2a2a2a] bg-[#121212] px-2 font-mono text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Start date</Label>
            <Input
              name="startDate"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
              className="border-[#2a2a2a] bg-[#1b1b1b]"
            />
          </div>
          <input type="hidden" name="status" value="Active" />

          {/* ── MT5 Auto-sync (optional) ── */}
          {market !== "Futures" ? (
          <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1b1b1b]">
            <button
              type="button"
              onClick={() => setMt5Open(v => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2.5">
                <span className="grid size-7 place-items-center rounded-lg bg-white/[.06] text-zinc-400">
                  <KeyRound size={14} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">MT5 import credentials</p>
                  <p className="text-[11px] text-[#8a8a8a]">Optional route for importing closed MT5 history.</p>
                </div>
              </div>
              <ChevronDown size={15} className={`text-[#8a8a8a] transition-transform ${mt5Open ? "rotate-180" : ""}`} />
            </button>

            {mt5Open && (
              <div className="space-y-3 border-t border-[#2a2a2a] px-4 py-4">
                <p className="text-[11px] text-[#8a8a8a]">
                  Enter platform credentials only when you want TradeWay to prepare MT5 import for this account.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8a8a]">
                      Login (Account ID)
                    </Label>
                    <Input
                      name="mt5Login"
                      value={mt5Login}
                      onChange={e => setMt5Login(e.target.value.replace(/\D/g, ""))}
                      placeholder="12345678"
                      inputMode="numeric"
                      className="border-[#2a2a2a] bg-[#111] font-mono text-sm text-zinc-200 placeholder:text-zinc-700 focus:border-white/25"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8a8a]">
                      Password
                    </Label>
                    <Input
                      name="mt5Password"
                      type="password"
                      value={mt5Password}
                      onChange={e => setMt5Password(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="border-[#2a2a2a] bg-[#111] text-sm text-zinc-200 placeholder:text-zinc-700 focus:border-white/25"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8a8a]">
                    Broker Server
                  </Label>
                  <Input
                    name="mt5Server"
                    value={mt5Server}
                    onChange={e => setMt5Server(e.target.value)}
                    placeholder="FTMODemo-Server, ICMarketsEU-Live04 ..."
                    className="border-[#2a2a2a] bg-[#111] text-sm text-zinc-200 placeholder:text-zinc-700 focus:border-white/25"
                  />
                  <p className="text-[10px] text-[#6a6a6a]">
                    MT5 terminalda: Tools → Options → Server — server nomini ko'chiring
                  </p>
                </div>
              </div>
            )}
          </div>
          ) : null}

          <Button
            disabled={saving}
            className="h-11 w-full bg-white text-black font-semibold hover:bg-zinc-200"
          >
            {saving ? <LoaderCircle className="animate-spin" /> : <Plus size={18} />}
            Create account
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
