"use client";

import {
  ArrowLeft,
  Building2,
  ChevronRight,
  FileSpreadsheet,
  KeyRound,
  LoaderCircle,
  Pencil,
  Plus,
  ShieldCheck,
  LockKeyhole,
  Sparkles,
  WalletCards,
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
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { useRouter } from "next/navigation";

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
            step >= item ? "border-white bg-white" : "border-white/10 bg-surface-raised",
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
  const router = useRouter();
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
    apiRequest<PremiumStatus>("/api/premium/status", { cacheMs: 60_000 })
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
        <DialogContent className="overflow-hidden border-[#1a1a1a] bg-surface p-0 text-zinc-100 sm:max-w-[520px]">
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
      <DialogContent className="max-h-[calc(100dvh-.5rem)] w-[calc(100vw-.5rem)] gap-0 overflow-hidden border-[#1a1a1a] bg-surface p-0 text-zinc-100 sm:max-h-[88dvh] sm:max-w-[780px]">
        <div className="flex items-center gap-3 border-b border-white/8 bg-black px-4 py-3.5 sm:px-5">
          <DialogHeader className="min-w-0 sm:w-36">
            <DialogTitle className="truncate text-base font-black sm:text-lg">Add account</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 justify-center"><StepDots step={step} /></div>
          <div className="mr-8 flex shrink-0 items-center gap-2 sm:mr-7">
            <span className={cn("hidden rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider sm:inline-flex", premiumStatus.plan === "free" ? "bg-white/[.06] text-zinc-400" : "bg-emerald-400/10 text-emerald-300")}>{premiumStatus.plan}</span>
            <span className="w-8 text-right text-[10px] font-black text-ink-subtle">{step}/3</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative max-h-[calc(100dvh-4.75rem)] overflow-y-auto sm:max-h-[calc(88dvh-61px)]">
          <div className="px-4 py-4 sm:px-6 sm:py-5">
            {step > 1 ? (
              <Button type="button" variant="outline" size="sm" onClick={goBack} className="mb-4 h-9 rounded-xl border-white/10 bg-surface hover:bg-surface-raised">
                <ArrowLeft size={16} /> Back
              </Button>
            ) : null}

            <div className="mx-auto mb-5 max-w-xl text-left sm:text-center">
              <h2 className="text-xl font-black tracking-tight sm:text-2xl">{stepTitle(step, accountKind, selectedPlatform)}</h2>
              <p className="mt-1.5 text-xs font-medium leading-5 text-ink-mute sm:mx-auto sm:max-w-md sm:text-sm">
                {stepDescription(step, accountKind, selectedPlatform)}
              </p>
            </div>

            {submitError ? (
              <div className="mx-auto mb-5 max-w-2xl rounded-2xl border border-rose-500/20 bg-[#1a0d10] px-4 py-3 text-sm text-rose-200">
                {submitError}
              </div>
            ) : null}

            {step === 1 ? (
              <div className="mx-auto grid max-w-[680px] gap-3 sm:grid-cols-2">
                <ChoiceCard icon={<Pencil size={20} />} title="Manual journal" text="Add and review trades yourself. Included with every plan." badge="Free included" onClick={chooseManual} />
                <ChoiceCard icon={<Zap size={20} />} title="Connect platform" text="Auto-sync MT5 or import supported CFD and Futures history." badge={premiumStatus.plan === "free" ? "Standard or Pro" : `${premiumStatus.plan} active`} locked={premiumStatus.plan === "free"} onClick={chooseAutomatic} />
              </div>
            ) : null}

            {step === 2 ? (
              <AccountPlatformSelector
                plan={premiumStatus.plan}
                onSelect={choosePlatform}
                onBack={goBack}
                onUpgrade={() => {
                  onOpenChange(false);
                  router.push("/pricing");
                }}
              />
            ) : null}

            {step === 3 ? (
              <div className="mx-auto max-w-[640px] space-y-4">
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#090909] px-3.5 py-3">
                    {accountKind === "automatic" ? <PlatformLogoBadge platform={selectedPlatform.id} compact /> : <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-black text-zinc-300"><Pencil size={15} /></span>}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-black text-white">{accountKind === "automatic" ? selectedPlatform.name : "Manual journal"}</p>
                        <span className="rounded-full bg-white/[.06] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-zinc-400">{premiumStatus.plan}</span>
                      </div>
                      <p className="truncate text-[10px] text-ink-mute">{accountKind === "manual" ? "Included with every plan" : selectedPlatform.mode === "csv" ? `${selectedPlatform.market} · CSV history import` : `${selectedPlatform.market} · Read-only auto sync`}</p>
                    </div>
                    <button type="button" onClick={goBack} className="ml-auto shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 transition hover:bg-white/[.06] hover:text-white">Change</button>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black p-4 sm:p-5">
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
                    <div className="mt-4 rounded-xl border border-white/10 bg-[#090909] p-4 text-xs leading-5 text-ink-soft">
                      Manual account creates a clean journal without connector setup. You can add trades from the journal after creating it.
                    </div>
                  ) : null}
                  </div>
              </div>
            ) : null}
          </div>

          {step === 3 ? (
            <div className="sticky bottom-0 flex items-center gap-2 border-t border-white/8 bg-surface px-4 py-3 sm:justify-end sm:px-5 sm:py-4">
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

function ChoiceCard({ icon, title, text, badge, locked = false, onClick }: { icon: ReactNode; title: string; text: string; badge: string; locked?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[150px] flex-col items-start justify-between rounded-2xl border border-white/10 bg-[#090909] p-4 text-left transition hover:border-white/25 hover:bg-[#0d0d0d] sm:min-h-[170px] sm:p-5"
    >
      <div className="flex w-full items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-xl border border-white/[.06] bg-black text-white">{icon}</span>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider", locked ? "bg-amber-400/10 text-amber-300" : "bg-emerald-400/10 text-emerald-300")}>{locked ? <LockKeyhole size={10} /> : <ShieldCheck size={10} />}{badge}</span>
      </div>
      <div className="mt-5">
        <h3 className="text-base font-bold sm:text-lg">{title}</h3>
        <p className="mt-1.5 max-w-xs text-xs font-medium leading-5 text-ink-mute">{text}</p>
      </div>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-300">{locked ? <Sparkles size={13} /> : null}{locked ? "Explore platforms" : "Continue"}<ChevronRight className="transition group-hover:translate-x-1" size={14} /></span>
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
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-[#090909] p-1">
        {(["prop", "real"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => changeAccountType(type)}
            className={cn(
              "rounded-lg py-2 text-sm font-bold capitalize transition",
              accountType === type ? "bg-white text-black" : "text-ink-mute hover:bg-white/[.04] hover:text-zinc-100",
            )}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-ink-mute">Name *</Label>
        <Input name="name" required placeholder={placeholder} className="h-11 border-white/10 bg-surface" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-ink-mute">{accountType === "prop" ? "Firm" : "Broker"}</Label>
          <Select value={firm} onValueChange={setFirm}>
            <SelectTrigger className="bg-[#090909]"><Building2 size={14} className="text-zinc-500" /><SelectValue /></SelectTrigger>
            <SelectContent>{sources.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-ink-mute">Size</Label>
          <Select value={String(size)} onValueChange={(value) => setSize(Number(value))}>
            <SelectTrigger className="bg-[#090909] font-mono"><WalletCards size={14} className="text-zinc-500" /><SelectValue /></SelectTrigger>
            <SelectContent>{SIZES.map((item) => <SelectItem key={item} value={String(item)}>${item.toLocaleString()}</SelectItem>)}</SelectContent>
          </Select>
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
    <div className="mt-4 rounded-xl border border-white/10 bg-[#090909] p-4">
      <div className={cn("flex w-full items-center justify-between text-left", connectNow && "mb-4")}>
        <div>
          <span className="flex items-center gap-2 text-sm font-black text-zinc-100"><KeyRound size={15} /> Connect MT5 now</span>
          <p className="mt-1 text-[10px] text-ink-mute">You can connect later from account settings.</p>
        </div>
        <Switch checked={connectNow} onCheckedChange={setConnectNow} aria-label="Connect MT5 now" />
      </div>
      {connectNow ? (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">Account login</Label><Input name="mt5Login" placeholder="e.g. 12345678" inputMode="numeric" autoComplete="off" className="h-11 border-white/10 bg-black font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">Investor password</Label><Input name="mt5Password" type="password" placeholder="Read-only password" autoComplete="new-password" className="h-11 border-white/10 bg-black" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">Broker server</Label><Input name="mt5Server" placeholder="e.g. Exness-MT5Trial15" autoComplete="off" className="h-11 border-white/10 bg-black" /></div>
          <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[.055] p-3 text-[11px] leading-5 text-emerald-50/80">
            <p className="flex items-start gap-2"><ShieldCheck size={13} className="mt-0.5 shrink-0" /> Investor password tavsiya qilinadi. Tradoxy faqat history o&apos;qiydi — trade ochmaydi, yopmaydi yoki o&apos;zgartirmaydi.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CsvImportNotice({ platform, report }: { platform: string; report: string }) {
  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-[#090909] p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><FileSpreadsheet size={18} /></span>
        <div>
          <h3 className="text-sm font-black text-white">{platform} CSV import</h3>
          <p className="mt-1 text-xs leading-5 text-ink-mute">Create the account first. Then open Account Settings and upload: {report}.</p>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[.055] p-3 text-[11px] leading-5 text-emerald-50/80">
        <p className="flex items-start gap-2"><ShieldCheck size={13} className="mt-0.5 shrink-0" /> No login password or OAuth key is required for CSV import.</p>
      </div>
    </div>
  );
}
