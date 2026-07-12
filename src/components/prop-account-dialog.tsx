"use client";

import {
  ArrowLeft,
  ChevronRight,
  FileText,
  KeyRound,
  LockKeyhole,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { PlatformLogoBadge } from "./platform-logo-badge";
import { PropFirmLogo } from "./prop-firm-logo";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const PROP_FIRMS = ["FTMO", "The5ers", "FundedNext", "FundingPips", "Alpha Capital", "Other"];
const BROKERS = ["Exness", "IC Markets", "MetaTrader Broker", "Other"];
const SIZES = [10000, 25000, 50000, 100000, 200000];

type WizardStep = 1 | 2 | 3;
type AccountKind = "manual" | "automatic";
type PlatformId = "mt5" | "tradovate" | "ninjatrader" | "projectx" | "ctrader" | "tradelocker" | "matchtrader";
type PlatformMode = "auto" | "csv" | "coming";

type PlatformConfig = {
  id: PlatformId;
  name: string;
  mode: PlatformMode;
  market: "CFD" | "Futures";
  badge: string;
  logo: string;
  helper: string;
  premium?: boolean;
  method: string;
};

const PLATFORMS: PlatformConfig[] = [
  { id: "mt5", name: "MetaTrader 5", mode: "auto", market: "CFD", badge: "Live", logo: "5", method: "Investor password", helper: "Read-only auto sync through the TradeWay VPS bridge." },
  { id: "tradelocker", name: "TradeLocker", mode: "coming", market: "CFD", badge: "Next", logo: "TL", method: "Email + server", helper: "Will exchange credentials for read-only keys and sync account history.", premium: true },
  { id: "ctrader", name: "cTrader", mode: "coming", market: "CFD", badge: "Next", logo: "c", method: "OAuth", helper: "Official cTrader authorization flow with read-only permissions.", premium: true },
  { id: "tradovate", name: "Tradovate", mode: "csv", market: "Futures", badge: "CSV", logo: "T", method: "CSV import", helper: "Export Orders CSV from Tradovate and import closed trades." },
  { id: "ninjatrader", name: "NinjaTrader", mode: "csv", market: "Futures", badge: "CSV", logo: "N", method: "CSV import", helper: "Export Trade Performance CSV in English and import it here." },
  { id: "projectx", name: "Project X", mode: "csv", market: "Futures", badge: "CSV", logo: "X", method: "CSV import", helper: "Futures CSV workflow prepared for Project X statements." },
  { id: "matchtrader", name: "MatchTrader", mode: "coming", market: "CFD", badge: "Later", logo: "M", method: "Web login", helper: "Connector research planned after MT5, TradeLocker and cTrader.", premium: true },
];

const CSV_PLATFORMS = new Set<PlatformId>(["tradovate", "ninjatrader", "projectx"]);

function badgeClass(mode: PlatformMode) {
  if (mode === "auto") return "bg-blue-500/15 text-blue-300";
  if (mode === "csv") return "bg-amber-400/15 text-amber-300";
  return "bg-white/10 text-zinc-400";
}

function stepTitle(step: WizardStep, accountKind: AccountKind | null, platform?: PlatformConfig) {
  if (step === 1) return "Select the Account Type";
  if (step === 2) return "Select your Trading Platform";
  if (accountKind === "manual") return "Create Manual Account";
  if (platform?.mode === "csv") return `${platform.name} CSV Import`;
  return "Connect MetaTrader 5";
}

function stepDescription(step: WizardStep, accountKind: AccountKind | null, platform?: PlatformConfig) {
  if (step === 1) return "Select if you want to add trades manually or import them from your trading account.";
  if (step === 2) return "MT5 works with auto sync. Futures platforms are prepared for CSV import.";
  if (accountKind === "manual") return "Create a clean journal account and add trades manually.";
  if (platform?.mode === "csv") return "Create the account now. CSV parser/import will be connected to this flow next.";
  return "Use your MT5 login, investor password and broker server. Existing MT5 flow is unchanged.";
}

function StepDots({ step }: { step: WizardStep }) {
  return (
    <div className="flex w-full max-w-[280px] items-center justify-center gap-0">
      {[1, 2, 3].map((item) => (
        <div key={item} className="flex items-center">
          <span className={cn(
            "grid size-4 place-items-center rounded-full border transition",
            step >= item ? "border-white bg-white" : "border-white/20 bg-white/20"
          )} />
          {item < 3 ? <span className={cn("h-1 w-28 transition", step > item ? "bg-white" : "bg-white/25")} /> : null}
        </div>
      ))}
    </div>
  );
}

type PremiumStatus = {
  isPremium: boolean;
};

export function PropAccountDialog({
  open, saving, onOpenChange, onSave,
}: {
  open: boolean;
  saving: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (f: FormData) => Promise<unknown> | unknown;
}) {
  const [step, setStep] = useState<WizardStep>(1);
  const [accountKind, setAccountKind] = useState<AccountKind | null>(null);
  const [accountType, setAccountType] = useState<"prop" | "real">("prop");
  const [firm, setFirm] = useState("FTMO");
  const [platform, setPlatform] = useState<PlatformId>("mt5");
  const [size, setSize] = useState(100000);
  const [connectNow, setConnectNow] = useState(true);
  const [internalSaving, setInternalSaving] = useState(false);
  const [csvFileName, setCsvFileName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [platformQuery, setPlatformQuery] = useState("");
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus>({ isPremium: false });
  const [premiumOverlay, setPremiumOverlay] = useState<PlatformConfig | null>(null);

  const selectedPlatform = useMemo(() => PLATFORMS.find((item) => item.id === platform) ?? PLATFORMS[0], [platform]);
  const filteredPlatforms = useMemo(() => {
    const query = platformQuery.trim().toLowerCase();
    if (!query) return PLATFORMS;
    return PLATFORMS.filter((item) =>
      `${item.name} ${item.market} ${item.method}`.toLowerCase().includes(query)
    );
  }, [platformQuery]);
  const sources = accountType === "prop" ? PROP_FIRMS : BROKERS;
  const activePlatform = accountKind === "manual" ? "manual" : platform;
  const market = accountKind === "manual" ? "CFD" : selectedPlatform.market;
  const importSource = accountKind === "manual"
    ? "manual"
    : selectedPlatform.id === "mt5"
      ? "mt5_bridge"
      : CSV_PLATFORMS.has(selectedPlatform.id)
        ? selectedPlatform.id
        : "manual";
  const phase = accountType === "real" ? "Live" : "Challenge";
  const createsProcessingMt5 = accountKind === "automatic" && platform === "mt5" && connectNow;
  const isSubmitting = saving || internalSaving;

  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => {
      setStep(1);
      setAccountKind(null);
      setAccountType("prop");
      setFirm("FTMO");
      setPlatform("mt5");
      setSize(100000);
      setConnectNow(true);
      setCsvFileName("");
      setSubmitError(null);
      setPlatformQuery("");
      setPremiumOverlay(null);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    apiRequest<PremiumStatus>("/api/premium/status")
      .then((response) => {
        if (active) setPremiumStatus(response);
      })
      .catch(() => {
        if (active) setPremiumStatus({ isPremium: false });
      });
    return () => {
      active = false;
    };
  }, [open]);

  function changeAccountType(next: "prop" | "real") {
    setAccountType(next);
    setFirm(next === "prop" ? "FTMO" : "Exness");
  }

  function chooseManual() {
    setAccountKind("manual");
    setConnectNow(false);
    setStep(3);
  }

  function chooseAutomatic() {
    setAccountKind("automatic");
    setPlatform("mt5");
    setConnectNow(true);
    setSubmitError(null);
    setStep(2);
  }

  function choosePlatform(item: PlatformConfig) {
    if (item.premium && !premiumStatus.isPremium) {
      setPremiumOverlay(item);
      return;
    }
    if (item.mode === "coming") {
      setSubmitError(`${item.name} connector is reserved for the next release.`);
      return;
    }
    setPlatform(item.id);
    setConnectNow(item.id === "mt5");
    setSubmitError(null);
    setStep(3);
  }

  function goBack() {
    if (step === 3 && accountKind === "manual") {
      setStep(1);
      setAccountKind(null);
      return;
    }
    if (step === 3) {
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(1);
      setAccountKind(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (accountKind === "automatic" && selectedPlatform.premium && !premiumStatus.isPremium) {
      setPremiumOverlay(selectedPlatform);
      setSubmitError("Upgrade to Premium to continue with this connector.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const mt5Login = String(form.get("mt5Login") || "").trim();
    const mt5Password = String(form.get("mt5Password") || "").trim();
    const mt5Server = String(form.get("mt5Server") || "").trim();

    if (createsProcessingMt5 && (!mt5Login || !mt5Password || !mt5Server)) {
      setSubmitError("Enter MT5 login, investor password and broker server.");
      return;
    }

    setInternalSaving(true);
    try {
      const created = await onSave(form);
      if (!created) return;
      onOpenChange(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Account was not created.");
    } finally {
      setInternalSaving(false);
    }
  }

  useEffect(() => {
    if (!open || step !== 3) return;
    if (accountKind === "automatic" && selectedPlatform.premium && !premiumStatus.isPremium) {
      setPremiumOverlay(selectedPlatform);
      setStep(2);
    }
  }, [accountKind, open, premiumStatus.isPremium, selectedPlatform, step]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-hidden border-[#242424] bg-black p-0 text-zinc-100 sm:max-w-[900px]">
        <div className="flex items-center border-b border-white/8 bg-black px-5 py-4">
          <DialogHeader className="min-w-[180px]">
            <DialogTitle className="text-lg font-black">Add Account</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 justify-center">
            <StepDots step={step} />
          </div>
          <div className="w-[180px]" />
        </div>

        <form onSubmit={handleSubmit} className="relative max-h-[calc(92dvh-73px)] overflow-y-auto">
          <div className="px-5 py-5 sm:px-8 sm:py-6">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={goBack} className="mb-4 border-white/10 bg-[#050505] hover:bg-[#111111]">
                <ArrowLeft size={16} /> Back
              </Button>
            ) : null}

            <div className="mx-auto mb-7 max-w-xl text-center">
              <span className="mb-3 inline-flex rounded-lg bg-white/8 px-2 py-1 text-xs font-black text-zinc-400">{step}/3</span>
              <h2 className="text-2xl font-black tracking-tight">{stepTitle(step, accountKind, selectedPlatform)}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-zinc-500">
                {stepDescription(step, accountKind, selectedPlatform)}
              </p>
            </div>

            {submitError ? (
              <div className="mx-auto mb-5 max-w-2xl rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {submitError}
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-5 md:grid-cols-2">
                <ChoiceCard
                  icon={<Pencil size={22} />}
                  title="Manual Account"
                  text="Create a manual account and add your trades manually. Analytics will be generated automatically."
                  onClick={chooseManual}
                />
                <ChoiceCard
                  icon={<Zap size={22} />}
                  title="Automatic Account"
                  text="Connect MT5 with auto sync or prepare a futures account for CSV import."
                  onClick={chooseAutomatic}
                />
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                {!premiumStatus.isPremium ? (
                  <div className="mx-auto max-w-2xl overflow-hidden rounded-[24px] border border-white/10 bg-black shadow-[0_22px_50px_rgba(0,0,0,.4)]">
                    <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-200/75">TradeWay Premium</p>
                        <h3 className="mt-1 text-base font-black text-white sm:text-lg">Unlock cTrader, TradeLocker, MatchTrader and AI-powered sync tools</h3>
                        <p className="mt-1 text-xs leading-5 text-zinc-400 sm:text-sm">
                          Free accounts can use MT5 and futures import. Premium opens advanced connectors and the full automation stack.
                        </p>
                      </div>
                      <Button
                        type="button"
                        className="shrink-0 bg-white text-black hover:bg-zinc-200"
                        onClick={() => {
                          onOpenChange(false);
                          window.history.pushState(null, "", "/pricing");
                          window.dispatchEvent(new Event("popstate"));
                        }}
                      >
                        Upgrade
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-black p-3">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Search size={16} />
                    <span className="font-semibold">Premium connectors and CSV imports</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    CFD accounts use read-only connectors. Futures accounts start with CSV import until official API access is ready.
                  </p>
                </div>

                <div className="mx-auto max-w-md">
                  <div className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#050505] px-4">
                    <Search size={16} className="text-zinc-500" />
                    <input
                      value={platformQuery}
                      onChange={(event) => setPlatformQuery(event.target.value)}
                      placeholder="Search platform..."
                      className="h-full w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {filteredPlatforms.map((item) => {
                    const locked = item.premium && !premiumStatus.isPremium;
                    return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => choosePlatform(item)}
                      className={cn(
                        "group relative min-h-[196px] rounded-[28px] border p-4 text-left shadow-[0_18px_48px_rgba(0,0,0,.22)] transition",
                        locked
                          ? "border-sky-400/20 bg-[#050505] hover:border-sky-300/30 hover:bg-[#111111]"
                          : item.mode === "coming"
                            ? "border-white/5 bg-[#080808] opacity-70"
                            : "border-white/10 bg-[#050505] hover:border-white/25 hover:bg-[#111111]"
                      )}
                    >
                      <div className={cn("transition", locked ? "pointer-events-none opacity-35" : "")}>
                        <span className="flex items-start justify-between gap-3">
                          <PlatformLogoBadge platform={item.id} />
                          <span className="flex flex-wrap justify-end gap-1">
                            {item.premium ? <span className="rounded-full border border-sky-300/15 bg-sky-400/10 px-2 py-0.5 text-[9px] font-black uppercase text-sky-200">Premium</span> : null}
                            <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-black uppercase", badgeClass(item.mode))}>{item.badge}</span>
                          </span>
                        </span>
                        <span className="mt-4 block text-base font-black text-zinc-100">{item.name}</span>
                        <span className="mt-1 block text-xs font-bold text-zinc-400">{item.method}</span>
                        <span className="mt-3 block text-xs leading-5 text-zinc-600">{item.helper}</span>
                        <div className="mt-4 flex items-center justify-between">
                          <span className={cn(
                            "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
                            item.market === "CFD" ? "bg-blue-500/10 text-blue-200" : "bg-amber-400/10 text-amber-200"
                          )}>
                            {item.market}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                            {locked ? "Upgrade required" : item.mode === "auto" ? "Ready now" : item.mode === "csv" ? "Import ready" : "Connector queued"}
                          </span>
                        </div>
                      </div>
                      {locked ? (
                        <span className="absolute inset-0 flex flex-col items-center justify-center rounded-[28px] bg-black/92 px-4 text-center">
                          <span className="grid size-10 place-items-center rounded-2xl border border-sky-300/20 bg-sky-400/12 text-sky-100">
                            <LockKeyhole size={16} />
                          </span>
                          <span className="mt-3 text-sm font-black text-white">Premium connector</span>
                          <span className="mt-1 text-[11px] font-medium leading-5 text-zinc-300">Upgrade to unlock {item.name} and advanced sync.</span>
                          <span className="mt-4 inline-flex rounded-full border border-white/12 bg-[#050505] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">Upgrade now</span>
                        </span>
                      ) : null}
                      {locked ? <span className="absolute right-4 top-4 grid size-8 place-items-center rounded-2xl border border-sky-300/15 bg-sky-400/10 text-sky-200"><LockKeyhole size={14} /></span> : null}
                    </button>
                  );})}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid overflow-hidden rounded-2xl border border-white/10 bg-black md:grid-cols-[1.1fr_.9fr]">
                <div className="space-y-4 p-5 sm:p-6">
                  <div className="rounded-2xl border border-white/10 bg-[#050505] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#080808] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-300">
                        {accountType === "prop" ? "Prop account" : "Real account"}
                      </span>
                      {accountKind === "automatic" ? <PlatformLogoBadge platform={selectedPlatform.id} compact /> : null}
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <PropFirmLogo firm={firm} compact />
                      <div className="min-w-0">
                        <p className="text-sm font-black text-zinc-100">{firm}</p>
                        <p className="text-xs text-zinc-500">
                          {accountKind === "manual"
                            ? "Manual journal workspace"
                            : selectedPlatform.id === "mt5"
                              ? "Auto sync with MT5 bridge"
                              : `${selectedPlatform.name} import flow`}
                        </p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500">Size</p>
                        <p className="font-mono text-sm font-black text-zinc-100">${size.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <AccountBasics
                    accountType={accountType}
                    changeAccountType={changeAccountType}
                    firm={firm}
                    setFirm={setFirm}
                    sources={sources}
                    size={size}
                    setSize={setSize}
                    placeholder={accountKind === "manual" ? "Manual account" : selectedPlatform.id === "mt5" ? "FTMO MT5 100K" : `${selectedPlatform.name} CSV`}
                  />

                  {accountKind === "automatic" && selectedPlatform.id === "mt5" ? (
                    <Mt5Fields connectNow={connectNow} setConnectNow={setConnectNow} />
                  ) : null}

                  {accountKind === "automatic" && selectedPlatform.mode === "csv" ? (
                    <CsvFields platform={selectedPlatform} csvFileName={csvFileName} setCsvFileName={setCsvFileName} />
                  ) : null}

                  {accountKind === "manual" ? (
                    <div className="rounded-xl border border-white/10 bg-[#050505] p-4 text-xs leading-5 text-zinc-400">
                      Manual account creates a clean journal without connector setup. You can add trades from the journal after creating it.
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-white/10 bg-black p-5 sm:p-6 md:border-l md:border-t-0">
                  <SideGuide accountKind={accountKind} platform={selectedPlatform} />
                </div>
              </div>
            ) : null}
          </div>

          {step === 3 ? (
            <div className="flex items-center justify-end gap-2 border-t border-white/8 bg-black px-5 py-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button disabled={isSubmitting} className="bg-white font-semibold text-black hover:bg-zinc-200">
                {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Plus size={18} />}
                {createsProcessingMt5 ? "Create and import history" : selectedPlatform.mode === "csv" && accountKind === "automatic" ? "Create CSV account" : "Add Account"}
              </Button>
            </div>
          ) : null}

          <input type="hidden" name="accountType" value={accountType} />
          <input type="hidden" name="firm" value={firm} />
          <input type="hidden" name="propSite" value={accountType === "prop" ? firm : ""} />
          <input type="hidden" name="propLogin" value="" />
          <input type="hidden" name="phase" value={phase} />
          <input type="hidden" name="marketType" value={market} />
          <input type="hidden" name="platform" value={activePlatform} />
          <input type="hidden" name="importSource" value={importSource} />
          <input type="hidden" name="accountSize" value={size} />
          <input type="hidden" name="initialBalance" value={size} />
          <input type="hidden" name="profitTarget" value={Math.round(size * 0.08)} />
          <input type="hidden" name="maxDrawdown" value={Math.round(size * 0.10)} />
          <input type="hidden" name="dailyDrawdown" value={Math.round(size * 0.05)} />
          <input type="hidden" name="startDate" value={new Date().toISOString().slice(0, 10)} />
          <input type="hidden" name="status" value={createsProcessingMt5 ? "Processing" : "Active"} />
        </form>
        {premiumOverlay ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black p-4">
            <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-black p-6 text-center shadow-[0_30px_80px_rgba(0,0,0,.7)]">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-sky-300/15 bg-sky-400/10 text-sky-200">
                <LockKeyhole size={22} />
              </span>
              <h3 className="mt-5 text-2xl font-black">Unlock {premiumOverlay.name}</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
                {premiumOverlay.name}, AI trade analysis and advanced connector stack are part of TradeWay Premium.
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" className="border-white/10 bg-[#0b0b0b]" onClick={() => setPremiumOverlay(null)}>
                  <ArrowLeft size={15} /> Back
                </Button>
                <Button
                  type="button"
                  className="bg-white text-black hover:bg-zinc-200"
                  onClick={() => {
                    setPremiumOverlay(null);
                    onOpenChange(false);
                    window.history.pushState(null, "", "/pricing");
                    window.dispatchEvent(new Event("popstate"));
                  }}
                >
                  Upgrade now
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ChoiceCard({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[280px] flex-col items-center justify-center rounded-[28px] border border-white/10 bg-[#0b0b0b] p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.03)] transition hover:border-white/25 hover:bg-[#121212]"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-[#161616] text-white">{icon}</span>
      <h3 className="mt-6 text-2xl font-black">{title}</h3>
      <p className="mt-4 max-w-xs text-sm font-semibold leading-6 text-zinc-500">{text}</p>
      <ChevronRight className="mt-8 transition group-hover:translate-x-1" size={28} />
    </button>
  );
}

function AccountBasics({
  accountType,
  changeAccountType,
  firm,
  setFirm,
  sources,
  size,
  setSize,
  placeholder,
}: {
  accountType: "prop" | "real";
  changeAccountType: (v: "prop" | "real") => void;
  firm: string;
  setFirm: (v: string) => void;
  sources: string[];
  size: number;
  setSize: (v: number) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#0b0b0b] p-1">
        {(["prop", "real"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => changeAccountType(type)}
            className={cn(
              "rounded-lg py-2 text-sm font-bold capitalize transition",
              accountType === type ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-100"
            )}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Name *</Label>
        <Input name="name" required placeholder={placeholder} className="h-11 border-white/10 bg-[#080808]" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{accountType === "prop" ? "Firm" : "Broker"}</Label>
          <select
            value={firm}
            onChange={(event) => setFirm(event.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#080808] px-3 text-sm font-semibold text-zinc-100 outline-none focus:border-white/25"
          >
            {sources.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Size</Label>
          <select
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#080808] px-3 font-mono text-sm font-bold text-zinc-100 outline-none focus:border-white/25"
          >
            {SIZES.map((item) => <option key={item} value={item}>${item.toLocaleString()}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

function Mt5Fields({ connectNow, setConnectNow }: { connectNow: boolean; setConnectNow: (v: boolean | ((value: boolean) => boolean)) => void }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b0b0b] p-4">
      <button type="button" onClick={() => setConnectNow((value) => !value)} className="mb-4 flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 text-sm font-black text-zinc-100"><KeyRound size={15} /> Connect MT5 now</span>
        <span className={cn("rounded-full px-2 py-1 text-[10px] font-black uppercase", connectNow ? "bg-emerald-400/15 text-emerald-200" : "bg-[#161616] text-zinc-400")}>{connectNow ? "On" : "Later"}</span>
      </button>
      {connectNow ? (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="mt5Login" placeholder="MT5 login / account ID" inputMode="numeric" autoComplete="off" className="h-11 border-white/10 bg-[#080808] font-mono" />
            <Input name="mt5Password" type="password" placeholder="Investor password" autoComplete="new-password" className="h-11 border-white/10 bg-[#080808]" />
          </div>
          <Input name="mt5Server" placeholder="Broker server, e.g. Exness-MT5Trial15" autoComplete="off" className="h-11 border-white/10 bg-[#080808]" />
          <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[.055] p-3 text-[11px] leading-5 text-emerald-50/80">
            <p className="flex items-start gap-2"><ShieldCheck size={13} className="mt-0.5 shrink-0" /> Investor password tavsiya qilinadi. TradeWay faqat history o&apos;qiydi — trade ochmaydi, yopmaydi yoki o&apos;zgartirmaydi.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CsvFields({ platform, csvFileName, setCsvFileName }: { platform: PlatformConfig; csvFileName: string; setCsvFileName: (v: string) => void }) {
  return (
    <div className="space-y-3 rounded-xl border border-amber-300/15 bg-amber-300/[.055] p-4">
      <div className="flex items-start gap-3">
        <UploadCloud size={18} className="mt-0.5 text-amber-200" />
        <div>
          <p className="text-sm font-black text-amber-100">{platform.name} CSV Import</p>
          <p className="mt-1 text-xs leading-5 text-amber-100/70">CSV parser keyingi patchda ulanadi. Hozir bu account CSV import source bilan yaratiladi.</p>
        </div>
      </div>
      <Label className="flex min-h-[112px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-amber-200/20 bg-black/20 px-4 text-center transition hover:bg-black/30">
        <FileText size={22} className="text-amber-200" />
        <span className="mt-2 text-sm font-bold text-zinc-100">{csvFileName || "Upload trade history CSV"}</span>
        <span className="mt-1 text-xs text-zinc-500">.csv file accepted</span>
        <Input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => setCsvFileName(event.target.files?.[0]?.name || "")}
        />
      </Label>
    </div>
  );
}

function SideGuide({ accountKind, platform }: { accountKind: AccountKind | null; platform: PlatformConfig }) {
  const isManual = accountKind === "manual";
  const isCsv = accountKind === "automatic" && platform.mode === "csv";
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {isManual ? (
            <span className="grid size-10 place-items-center rounded-xl bg-[#161616] text-zinc-200">
            <Pencil size={18} />
          </span>
        ) : (
          <PlatformLogoBadge platform={platform.id} compact />
        )}
        <div>
          <h3 className="text-xl font-black">{isManual ? "Manual" : isCsv ? platform.name : "MetaTrader 5"}</h3>
          <p className="text-xs font-semibold text-zinc-500">{isManual ? "Add trades manually" : isCsv ? "CSV import" : "Auto sync"}</p>
        </div>
      </div>

      <div className="space-y-5 text-sm">
        <GuideItem number="1" title={isManual ? "Enter a Name" : "Create the Account"} text={isManual ? "Select a name for this account to easily identify it later." : "Fill the basic account details and select prop firm or broker."} />
        <GuideItem number="2" title={isCsv ? "Upload CSV" : isManual ? "Enter Initial Balance" : "Enter MT5 Credentials"} text={isCsv ? "Upload your platform statement CSV. Parser will attach trades to this account." : isManual ? "Initial balance is used to calculate progress and account statistics." : "Use investor password when available for read-only history access."} />
        <GuideItem number="3" title={isCsv ? "Import Trades" : isManual ? "Create Account" : "Initial Sync"} text={isCsv ? "Tradovate, NinjaTrader and Project X will use this CSV import flow." : isManual ? "After creation, add trades from the journal manually." : "Account starts as Processing and becomes Active after MT5 history is imported."} />
      </div>

      {platform.id === "mt5" && !isManual ? (
        <div className="rounded-xl border border-white/10 bg-black/25 p-3 text-[11px] leading-5 text-zinc-400">
          <Sparkles size={13} className="mb-2" />
          Broker yoki prop firmangizning IP restriction qoidalarini tekshiring. Azure VPS IP orqali read-only connection bo&apos;ladi.
        </div>
      ) : null}
    </div>
  );
}

function GuideItem({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div>
      <p className="flex items-center gap-2 font-black text-zinc-100"><span className="grid size-5 place-items-center rounded-full bg-zinc-100 text-[11px] text-black">{number}</span>{title}</p>
      <p className="mt-1 pl-7 text-xs leading-5 text-zinc-500">{text}</p>
    </div>
  );
}
