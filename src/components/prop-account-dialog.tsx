"use client";

import {
  ArrowLeft,
  ChevronRight,
  FileSpreadsheet,
  KeyRound,
  LoaderCircle,
  Pencil,
  Plus,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_PLATFORMS,
  AccountPlatformSelector,
  type AccountPlan,
  type PlatformConfig,
  type PlatformId,
} from "./account-platform-selector";
import { PlatformLogoBadge } from "./platform-logo-badge";
import { PropFirmLogo } from "./prop-firm-logo";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const PROP_FIRMS = ["FTMO", "The5ers", "FundedNext", "FundingPips", "Alpha Capital", "Topstep", "Apex Trader Funding", "Other"];
const BROKERS = ["Tradovate", "NinjaTrader", "MatchTrader", "Project X", "Exness", "IC Markets", "MetaTrader Broker", "Other"];
const SIZES = [10000, 25000, 50000, 100000, 200000];

type WizardStep = 1 | 2 | 3;
type AccountKind = "manual" | "automatic";

type PremiumStatus = {
  plan: AccountPlan;
  isPremium: boolean;
  autoSyncEnabled: boolean;
};

const CSV_REPORTS: Partial<Record<PlatformId, string>> = {
  tradovate: "Reports → Position History → Download report",
  ctrader: "Closed history or deals CSV export",
  ninjatrader: "Trade Performance → Trades → Export CSV",
  matchtrader: "Closed Positions → Export to CSV",
  projectx: "Trades or Day Trades report → Download CSV",
};

function stepTitle(step: WizardStep, accountKind: AccountKind | null, platform?: PlatformConfig) {
  if (step === 1) return "Select the Account Type";
  if (step === 2) return "Select your Trading Platform";
  if (accountKind === "manual") return "Create Manual Account";
  if (platform?.mode === "csv") return `Create ${platform.name} Import Account`;
  return "Connect MetaTrader 5";
}

function stepDescription(step: WizardStep, accountKind: AccountKind | null, platform?: PlatformConfig) {
  if (step === 1) return "Create a manual journal or connect/import an existing trading account.";
  if (step === 2) return "Choose a supported platform for secure sync or CSV trade-history import.";
  if (accountKind === "manual") return "Create a clean journal account and add trades manually.";
  if (platform?.mode === "csv") {
    return `Create the account now, then upload the ${platform.name} closed-trade CSV from Account Settings.`;
  }
  return "Use your MT5 login, investor password and broker server. Existing MT5 sync remains unchanged.";
}

function StepDots({ step }: { step: WizardStep }) {
  return (
    <div className="flex items-center justify-center gap-0" aria-label={`Step ${step} of 3`}>
      {[1, 2, 3].map((item) => (
        <div key={item} className="flex items-center">
          <span className={cn(
            "grid size-2.5 place-items-center rounded-full border transition",
            step >= item ? "border-white bg-white" : "border-white/10 bg-[#111111]",
          )} />
          {item < 3 ? <span className={cn("h-px w-10 transition sm:w-16", step > item ? "bg-white" : "bg-[#262626]")} /> : null}
        </div>
      ))}
    </div>
  );
}

export function PropAccountDialog({
  open,
  saving,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  saving: boolean;
  onOpenChange: (value: boolean) => void;
  onSave: (form: FormData) => Promise<unknown> | unknown;
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
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus>({
    plan: "free",
    isPremium: false,
    autoSyncEnabled: false,
  });
  const [premiumLoaded, setPremiumLoaded] = useState(false);

  const selectedPlatform = useMemo(
    () => ACCOUNT_PLATFORMS.find((item) => item.id === platform) ?? ACCOUNT_PLATFORMS[0],
    [platform],
  );
  const sources = accountType === "prop" ? PROP_FIRMS : BROKERS;
  const activePlatform = accountKind === "manual" ? "manual" : platform;
  const market = accountKind === "manual" ? "CFD" : selectedPlatform.market;
  const importSource = accountKind === "manual"
    ? "manual"
    : selectedPlatform.id === "mt5"
      ? "mt5_bridge"
      : selectedPlatform.id;
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
    setFirm(next === "prop" ? "FTMO" : selectedPlatform.mode === "csv" ? selectedPlatform.name : "Exness");
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
    if (premiumStatus.plan === "free") return;
    if (item.status !== "live") {
      setSubmitError(`${item.name} connector is coming soon.`);
      return;
    }

    setPlatform(item.id);
    setConnectNow(item.id === "mt5");
    if (accountType === "real") setFirm(item.mode === "csv" ? item.name : "Exness");
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

    if (accountKind === "automatic" && premiumStatus.plan === "free") {
      setSubmitError("Standard or Pro is required for platform sync and imports.");
      setStep(2);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] gap-0 overflow-hidden border-[#1a1a1a] bg-[#030303] p-0 text-zinc-100 sm:max-h-[88dvh] sm:max-w-[780px]">
        <div className="flex items-center gap-3 border-b border-white/8 bg-black px-4 py-3.5 sm:px-5">
          <DialogHeader className="min-w-0 sm:w-36">
            <DialogTitle className="truncate text-base font-black sm:text-lg">Add account</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 justify-center"><StepDots step={step} /></div>
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
              <h2 className="text-xl font-black tracking-tight sm:text-2xl">{stepTitle(step, accountKind, selectedPlatform)}</h2>
              <p className="mt-1.5 text-xs font-medium leading-5 text-zinc-500 sm:mx-auto sm:max-w-md sm:text-sm">
                {stepDescription(step, accountKind, selectedPlatform)}
              </p>
            </div>

            {submitError ? (
              <div className="mx-auto mb-5 max-w-2xl rounded-2xl border border-rose-500/20 bg-[#1a0d10] px-4 py-3 text-sm text-rose-200">
                {submitError}
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-5 md:grid-cols-2">
                <ChoiceCard icon={<Pencil size={22} />} title="Manual Account" text="Create a journal account and add your trades manually." onClick={chooseManual} />
                <ChoiceCard icon={<Zap size={22} />} title="Sync or Import Account" text="Sync MT5 automatically or import supported platform trade history from CSV." onClick={chooseAutomatic} />
              </div>
            ) : null}

            {step === 2 ? (
              <AccountPlatformSelector
                plan={premiumStatus.plan}
                onSelect={choosePlatform}
                onBack={goBack}
                onUpgrade={() => {
                  onOpenChange(false);
                  window.history.pushState(null, "", "/pricing");
                  window.dispatchEvent(new Event("popstate"));
                }}
              />
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
                        <p className="truncate text-sm font-black text-white">{firm}</p>
                        <p className="truncate text-[11px] text-zinc-500">
                          {accountKind === "manual"
                            ? "Manual journal workspace"
                            : selectedPlatform.mode === "csv"
                              ? `${selectedPlatform.name} CSV trade import`
                              : "Auto sync with MT5 bridge"}
                        </p>
                      </div>
                      <div className="ml-auto shrink-0 whitespace-nowrap text-right">
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
                    placeholder={accountKind === "manual" ? "Manual account" : selectedPlatform.mode === "csv" ? `${selectedPlatform.name} account` : "FTMO MT5 100K"}
                  />

                  {accountKind === "automatic" && selectedPlatform.id === "mt5" ? (
                    <Mt5Fields connectNow={connectNow} setConnectNow={setConnectNow} />
                  ) : null}

                  {accountKind === "automatic" && selectedPlatform.mode === "csv" ? (
                    <CsvImportNotice
                      platform={selectedPlatform.name}
                      report={CSV_REPORTS[selectedPlatform.id] || "Closed trade-history CSV export"}
                    />
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

function ChoiceCard({ icon, title, text, onClick }: { icon: ReactNode; title: string; text: string; onClick: () => void }) {
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
  changeAccountType: (value: "prop" | "real") => void;
  firm: string;
  setFirm: (value: string) => void;
  sources: string[];
  size: number;
  setSize: (value: number) => void;
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
              accountType === type ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-100",
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

function Mt5Fields({
  connectNow,
  setConnectNow,
}: {
  connectNow: boolean;
  setConnectNow: (value: boolean | ((current: boolean) => boolean)) => void;
}) {
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
            <p className="flex items-start gap-2"><ShieldCheck size={13} className="mt-0.5 shrink-0" /> Investor password tavsiya qilinadi. Tradox faqat history o&apos;qiydi — trade ochmaydi, yopmaydi yoki o&apos;zgartirmaydi.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CsvImportNotice({ platform, report }: { platform: string; report: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b0b0b] p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><FileSpreadsheet size={18} /></span>
        <div>
          <h3 className="text-sm font-black text-white">{platform} CSV import</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Create the account first. Then open Account Settings and upload: {report}.</p>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[.055] p-3 text-[11px] leading-5 text-emerald-50/80">
        <p className="flex items-start gap-2"><ShieldCheck size={13} className="mt-0.5 shrink-0" /> No login password or OAuth key is required for CSV import.</p>
      </div>
    </div>
  );
}
