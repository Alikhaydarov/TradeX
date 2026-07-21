"use client";

import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  KeyRound,
  LoaderCircle,
  Pencil,
  Plus,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_PLATFORMS,
  AccountPlatformSelector,
  type AccountPlan,
  type PlatformConfig,
  type PlatformId,
} from "./account-platform-selector";
import { AccountPlanGate } from "./account-plan-gate";
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

function stepTitle(step: WizardStep, accountKind: AccountKind | null) {
  if (step === 1) return "Select the Account Type";
  if (step === 2) return "Select your Trading Platform";
  if (accountKind === "manual") return "Create Manual Account";
  return "Connect MetaTrader 5";
}

function stepDescription(step: WizardStep, accountKind: AccountKind | null) {
  if (step === 1) return "Select if you want to add trades manually or import them from your trading account.";
  if (step === 2) return "Connect the platform that is available for your current plan.";
  if (accountKind === "manual") return "Create a clean journal account and add trades manually.";
  return "Use your MT5 login, investor password and broker server. Existing MT5 flow is unchanged.";
}

function StepDots({ step }: { step: WizardStep }) {
  return (
    <div className="flex items-center justify-center gap-0" aria-label={`Step ${step} of 3`}>
      {[1, 2, 3].map((item) => (
        <div key={item} className="flex items-center">
          <span className={cn(
            "grid size-2.5 place-items-center rounded-full border transition",
            step >= item ? "border-white bg-white" : "border-white/10 bg-[#111111]"
          )} />
          {item < 3 ? <span className={cn("h-px w-10 transition sm:w-16", step > item ? "bg-white" : "bg-[#262626]")} /> : null}
        </div>
      ))}
    </div>
  );
}
type PremiumStatus = {
  plan: AccountPlan;
  isPremium: boolean;
  autoSyncEnabled: boolean;
};

type FreeAccountView = "choose" | "manual" | "plans";

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus>({ plan: "free", isPremium: false, autoSyncEnabled: false });
  const [premiumLoaded, setPremiumLoaded] = useState(false);
  const [freeView, setFreeView] = useState<FreeAccountView>("choose");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const selectedPlatform = useMemo(() => ACCOUNT_PLATFORMS.find((item) => item.id === platform) ?? ACCOUNT_PLATFORMS[0], [platform]);
  const sources = accountType === "prop" ? PROP_FIRMS : BROKERS;
  const activePlatform = accountKind === "manual" ? "manual" : platform;
  const market = accountKind === "manual" ? "CFD" : selectedPlatform.market;
  const importSource = accountKind === "manual"
    ? "manual"
    : "mt5_bridge";
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
      setSubmitError(null);
      setFreeView("choose");
      setAdvancedOpen(false);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setPremiumLoaded(false);
    apiRequest<PremiumStatus>("/api/premium/status")
      .then((response) => {
        if (active) setPremiumStatus(response);
      })
      .catch(() => {
        if (active) setPremiumStatus({ plan: "free", isPremium: false, autoSyncEnabled: false });
      })
      .finally(() => {
        if (active) setPremiumLoaded(true);
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
    if (!premiumStatus.isPremium) {
      setFreeView("plans");
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

    if (accountKind === "automatic" && !premiumStatus.isPremium) {
      setFreeView("plans");
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

  if (open && !premiumLoaded) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="overflow-hidden border-[#1a1a1a] bg-[#050505] p-0 text-zinc-100 sm:max-w-[520px]">
          <div className="border-b border-white/8 px-5 py-4">
            <div className="h-5 w-36 animate-pulse rounded bg-white/10" />
            <div className="mt-2 h-3 w-64 animate-pulse rounded bg-white/[.06]" />
          </div>
          <div className="space-y-4 p-5">
            <div className="h-20 animate-pulse rounded-2xl bg-white/[.055]" />
            <div className="h-20 animate-pulse rounded-2xl bg-white/[.055]" />
            <div className="h-11 animate-pulse rounded-xl bg-white/[.055]" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (open && !premiumStatus.isPremium) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto border-[#222222] bg-[#070707] p-0 text-zinc-100 sm:max-w-[520px]">
          {freeView === "plans" ? (
            <AccountPlanGate
              onBack={() => setFreeView("choose")}
              onChoose={() => {
                onOpenChange(false);
                window.history.pushState(null, "", "/pricing");
                window.dispatchEvent(new Event("popstate"));
              }}
            />
          ) : freeView === "choose" ? (
            <div>
              <div className="border-b border-white/8 px-5 py-4 sm:px-6">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black">Add account</DialogTitle>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">Start manually or connect your trading account with a paid plan.</p>
                </DialogHeader>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
                <button type="button" onClick={() => { setAccountKind("manual"); setConnectNow(false); setFreeView("manual"); }} className="group rounded-2xl border border-white/10 bg-[#050505] p-4 text-left transition hover:border-white/25 hover:bg-[#0b0b0b]">
                  <span className="grid size-9 place-items-center rounded-xl bg-white text-black"><Pencil size={16} /></span>
                  <span className="mt-4 block text-sm font-black text-white">Manual account</span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500">Free journal. Add trades yourself.</span>
                  <span className="mt-4 flex items-center gap-1 text-[11px] font-bold text-zinc-300">Continue <ChevronRight size={13} /></span>
                </button>
                <button type="button" onClick={() => setFreeView("plans")} className="group rounded-2xl border border-sky-300/15 bg-[#071017] p-4 text-left transition hover:border-sky-300/30 hover:bg-[#0a151f]">
                  <span className="flex items-start justify-between gap-2">
                    <span className="grid size-9 place-items-center rounded-xl bg-sky-300 text-black"><Zap size={16} /></span>
                    <span className="rounded-full border border-sky-200/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-200">Premium</span>
                  </span>
                  <span className="mt-4 block text-sm font-black text-white">Automatic account</span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-400">MT5 sync, analytics and AI review.</span>
                  <span className="mt-4 flex items-center gap-1 text-[11px] font-bold text-sky-200">Compare plans <ChevronRight size={13} /></span>
                </button>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit}>
            <div className="border-b border-white/8 px-5 py-4 sm:px-6">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setFreeView("choose")} className="grid size-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-white" aria-label="Back"><ArrowLeft size={16} /></button>
                  <DialogTitle className="text-lg font-black">Manual account</DialogTitle>
                </div>
                <p className="mt-1 pl-10 text-xs text-zinc-500">Create a journal workspace in one step.</p>
              </DialogHeader>
            </div>
            <div className="space-y-5 px-5 py-5 sm:px-6">
              {submitError ? (
                <div className="rounded-2xl border border-rose-500/20 bg-[#1a0d10] px-4 py-3 text-sm text-rose-200">{submitError}</div>
              ) : null}

              <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black p-1">
                {(["prop", "real"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => changeAccountType(type)}
                    className={cn(
                      "h-10 rounded-lg text-sm font-bold capitalize transition",
                      accountType === type ? "bg-white text-black" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    {type === "prop" ? "Prop account" : "Personal account"}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="free-account-name" className="text-sm font-semibold text-zinc-200">Account name</Label>
                <Input id="free-account-name" name="name" required maxLength={60} placeholder={accountType === "prop" ? "FTMO Challenge" : "My trading account"} className="h-12 rounded-xl border-white/10 bg-[#111111]" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="free-account-balance" className="text-sm font-semibold text-zinc-200">Initial balance</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">$</span>
                  <Input
                    id="free-account-balance"
                    type="number"
                    inputMode="decimal"
                    min={100}
                    max={100000000}
                    step={100}
                    value={size}
                    onChange={(event) => setSize(Math.max(0, Number(event.target.value)))}
                    className="h-12 rounded-xl border-white/10 bg-[#111111] pl-8 font-mono text-base font-bold"
                  />
                </div>
                <p className="text-xs leading-5 text-zinc-600">Used as the starting point for P&amp;L, drawdown and growth.</p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                <button type="button" onClick={() => setAdvancedOpen((value) => !value)} className="flex h-12 w-full items-center justify-between px-4 text-left text-sm font-semibold text-zinc-300">
                  Advanced options
                  <ChevronDown size={16} className={cn("text-zinc-600 transition", advancedOpen && "rotate-180")} />
                </button>
                {advancedOpen ? (
                  <div className="space-y-2 border-t border-white/8 p-4">
                    <Label htmlFor="free-account-firm" className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{accountType === "prop" ? "Prop firm" : "Broker"}</Label>
                    <select
                      id="free-account-firm"
                      value={firm}
                      onChange={(event) => setFirm(event.target.value)}
                      className="h-11 w-full rounded-xl border border-white/10 bg-[#111111] px-3 text-sm font-semibold text-zinc-100 outline-none focus:border-white/25"
                    >
                      {sources.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                ) : null}
              </div>

            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/8 px-5 py-4 sm:px-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 bg-transparent">Cancel</Button>
              <Button disabled={isSubmitting || size < 100} className="bg-white font-semibold text-black hover:bg-zinc-200">
                {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Plus size={17} />}
                Create account
              </Button>
            </div>

            <input type="hidden" name="accountType" value={accountType} />
            <input type="hidden" name="firm" value={firm} />
            <input type="hidden" name="propSite" value={accountType === "prop" ? firm : ""} />
            <input type="hidden" name="propLogin" value="" />
            <input type="hidden" name="phase" value={accountType === "real" ? "Live" : "Challenge"} />
            <input type="hidden" name="marketType" value="CFD" />
            <input type="hidden" name="platform" value="manual" />
            <input type="hidden" name="importSource" value="manual" />
            <input type="hidden" name="accountSize" value={size} />
            <input type="hidden" name="initialBalance" value={size} />
            <input type="hidden" name="profitTarget" value={Math.round(size * 0.08)} />
            <input type="hidden" name="maxDrawdown" value={Math.round(size * 0.1)} />
            <input type="hidden" name="dailyDrawdown" value={Math.round(size * 0.05)} />
            <input type="hidden" name="startDate" value={new Date().toISOString().slice(0, 10)} />
            <input type="hidden" name="status" value="Active" />
          </form>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] gap-0 overflow-hidden border-[#1a1a1a] bg-[#030303] p-0 text-zinc-100 sm:max-h-[88dvh] sm:max-w-[780px]">
        <div className="flex items-center gap-3 border-b border-white/8 bg-black px-4 py-3.5 sm:px-5">
          <DialogHeader className="min-w-0 sm:w-36">
            <DialogTitle className="truncate text-base font-black sm:text-lg">Add account</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 justify-center">
            <StepDots step={step} />
          </div>
          <span className="mr-8 w-10 shrink-0 text-right text-[10px] font-black text-zinc-600 sm:mr-7 sm:w-20">{step} / 3</span>
        </div>

        <form onSubmit={handleSubmit} className="relative max-h-[calc(100dvh-4.75rem)] overflow-y-auto sm:max-h-[calc(88dvh-61px)]">
          <div className="px-4 py-4 sm:px-6 sm:py-5">
            {step > 1 ? (
              <Button type="button" variant="outline" size="sm" onClick={goBack} className="mb-4 h-9 rounded-xl border-white/10 bg-[#050505] hover:bg-[#111111]">
                <ArrowLeft size={16} /> Back
              </Button>
            ) : null}

            <div className="mx-auto mb-5 max-w-xl text-left sm:text-center">
              <h2 className="text-xl font-black tracking-tight sm:text-2xl">{stepTitle(step, accountKind)}</h2>
              <p className="mt-1.5 text-xs font-medium leading-5 text-zinc-500 sm:mx-auto sm:max-w-md sm:text-sm">
                {stepDescription(step, accountKind)}
              </p>
            </div>

            {submitError ? (
              <div className="mx-auto mb-5 max-w-2xl rounded-2xl border border-rose-500/20 bg-[#1a0d10] px-4 py-3 text-sm text-rose-200">
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
                  text="Connect MetaTrader 5 with secure, read-only automatic sync."
                  onClick={chooseAutomatic}
                />
              </div>
            ) : null}

            {step === 2 ? (
              <AccountPlatformSelector plan={premiumStatus.plan === "pro" ? "pro" : "standard"} onSelect={choosePlatform} />
            ) : null}

            {step === 3 ? (
              <div className="mx-auto max-w-[640px] overflow-hidden rounded-2xl border border-white/10 bg-black">
                <div className="space-y-4 p-4 sm:p-5">
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
                    placeholder={accountKind === "manual" ? "Manual account" : "FTMO MT5 100K"}
                  />

                  {accountKind === "automatic" && selectedPlatform.id === "mt5" ? (
                    <Mt5Fields connectNow={connectNow} setConnectNow={setConnectNow} />
                  ) : null}

                  {accountKind === "manual" ? (
                    <div className="rounded-xl border border-white/10 bg-[#050505] p-4 text-xs leading-5 text-zinc-400">
                      Manual account creates a clean journal without connector setup. You can add trades from the journal after creating it.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {step === 3 ? (
            <div className="sticky bottom-0 flex items-center gap-2 border-t border-white/8 bg-[#030303]/95 px-4 py-3 backdrop-blur sm:justify-end sm:px-5 sm:py-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">Cancel</Button>
              <Button disabled={isSubmitting} className="flex-1 bg-white font-semibold text-black hover:bg-zinc-200 sm:flex-none">
                {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Plus size={18} />}
                {createsProcessingMt5 ? "Create and sync" : "Add account"}
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
      </DialogContent>
    </Dialog>
  );
}

function ChoiceCard({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#050505] p-5 text-center transition hover:border-white/25 hover:bg-[#111111] sm:min-h-[210px]"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-[#161616] text-white">{icon}</span>
      <h3 className="mt-4 text-lg font-black sm:text-xl">{title}</h3>
      <p className="mt-2 max-w-xs text-xs font-semibold leading-5 text-zinc-500 sm:text-sm">{text}</p>
      <ChevronRight className="mt-4 transition group-hover:translate-x-1" size={20} />
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

