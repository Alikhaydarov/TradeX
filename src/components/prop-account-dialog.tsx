"use client";

import {
  ArrowLeft,
  ChevronRight,
  Database,
  FileText,
  KeyRound,
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
  { id: "mt5", name: "MetaTrader 5", mode: "auto", market: "CFD", badge: "Live", logo: "5", method: "Investor password", helper: "Read-only auto sync through the TradeWay VPS bridge.", premium: true },
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

function PlatformLogo({ item }: { item: PlatformConfig }) {
  return (
    <span className={cn(
      "grid size-11 place-items-center rounded-xl text-sm font-black",
      item.id === "mt5" ? "bg-emerald-400/15 text-emerald-200" :
      item.premium ? "bg-blue-400/15 text-blue-200" :
      item.mode === "csv" ? "bg-white text-orange-600" : "bg-white/8 text-zinc-400"
    )}>
      {item.logo}
    </span>
  );
}

export function PropAccountDialog({
  open, saving, onOpenChange, onSave,
}: {
  open: boolean;
  saving: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (f: FormData) => void | Promise<void>;
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

  const selectedPlatform = useMemo(() => PLATFORMS.find((item) => item.id === platform) ?? PLATFORMS[0], [platform]);
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
    }, 160);
    return () => window.clearTimeout(timer);
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
    setStep(2);
  }

  function choosePlatform(item: PlatformConfig) {
    if (item.mode === "coming") return;
    setPlatform(item.id);
    setConnectNow(item.id === "mt5");
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
    if (!createsProcessingMt5) return;
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const body: Record<string, string> = Object.fromEntries(
      [...form.entries()].map(([key, value]) => [key, String(value)])
    );
    const mt5Login = (body.mt5Login ?? "").trim();
    const mt5Password = (body.mt5Password ?? "").trim();
    const mt5Server = (body.mt5Server ?? "").trim();

    if (!mt5Login || !mt5Password || !mt5Server) {
      window.alert("MT5 login, investor password va server nomini kiriting.");
      return;
    }

    delete body.mt5Login;
    delete body.mt5Password;
    delete body.mt5Server;
    body.status = "Processing";

    setInternalSaving(true);
    try {
      const result = await apiRequest<{ account: { id: string } }>("/api/prop-accounts", {
        method: "POST",
        body: JSON.stringify(body),
      });

      await apiRequest(`/api/prop-accounts/${result.account.id}/mt5`, {
        method: "PUT",
        body: JSON.stringify({ login: mt5Login, password: mt5Password, server: mt5Server }),
      });

      onOpenChange(false);
      window.setTimeout(() => window.location.reload(), 250);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Account yaratilmadi.");
    } finally {
      setInternalSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-hidden border-[#242424] bg-[#070707] p-0 text-zinc-100 sm:max-w-[900px]">
        <div className="flex items-center border-b border-white/8 bg-[#0d0d0d] px-5 py-4">
          <DialogHeader className="min-w-[180px]">
            <DialogTitle className="text-lg font-black">Add Account</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 justify-center">
            <StepDots step={step} />
          </div>
          <div className="w-[180px]" />
        </div>

        <form action={onSave} onSubmit={handleSubmit} className="max-h-[calc(92dvh-73px)] overflow-y-auto">
          <div className="px-5 py-5 sm:px-8 sm:py-6">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={goBack} className="mb-4 border-white/10 bg-white/[.04]">
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
                <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/[.035] p-3">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Search size={16} />
                    <span className="font-semibold">Premium connectors and CSV imports</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    CFD accounts use read-only connectors. Futures accounts start with CSV import until official API access is ready.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {PLATFORMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={item.mode === "coming"}
                      onClick={() => choosePlatform(item)}
                      className={cn(
                        "group min-h-[188px] rounded-2xl border p-4 text-left transition",
                        item.mode === "coming"
                          ? "cursor-not-allowed border-white/5 bg-white/[.018] opacity-70"
                          : "border-white/10 bg-white/[.035] hover:border-white/25 hover:bg-white/[.06]"
                      )}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <PlatformLogo item={item} />
                        <span className="flex flex-wrap justify-end gap-1">
                          {item.premium ? <span className="rounded-full border border-blue-300/15 bg-blue-400/10 px-2 py-0.5 text-[9px] font-black uppercase text-blue-200">Premium</span> : null}
                          <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-black uppercase", badgeClass(item.mode))}>{item.badge}</span>
                        </span>
                      </span>
                      <span className="mt-4 block text-base font-black text-zinc-100">{item.name}</span>
                      <span className="mt-1 block text-xs font-bold text-zinc-400">{item.method}</span>
                      <span className="mt-3 block text-xs leading-5 text-zinc-600">{item.helper}</span>
                      <span className="mt-4 inline-flex text-[10px] font-black uppercase tracking-wider text-zinc-500">
                        {item.mode === "auto" ? "Ready now" : item.mode === "csv" ? "Import ready" : "Connector queued"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] md:grid-cols-[1.1fr_.9fr]">
                <div className="space-y-4 p-5 sm:p-6">
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
                    <div className="rounded-xl border border-white/10 bg-white/[.035] p-4 text-xs leading-5 text-zinc-400">
                      Manual account creates a clean journal without connector setup. You can add trades from the journal after creating it.
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-white/10 bg-white/[.025] p-5 sm:p-6 md:border-l md:border-t-0">
                  <SideGuide accountKind={accountKind} platform={selectedPlatform} />
                </div>
              </div>
            ) : null}
          </div>

          {step === 3 ? (
            <div className="flex items-center justify-end gap-2 border-t border-white/8 bg-[#0d0d0d] px-5 py-4">
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
      </DialogContent>
    </Dialog>
  );
}

function ChoiceCard({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[.025] p-8 text-center transition hover:border-white/25 hover:bg-white/[.05]"
    >
      <span className="grid size-10 place-items-center rounded-lg bg-white/10 text-white">{icon}</span>
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
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[.035] p-1">
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
    <div className="rounded-xl border border-white/10 bg-white/[.035] p-4">
      <button type="button" onClick={() => setConnectNow((value) => !value)} className="mb-4 flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 text-sm font-black text-zinc-100"><KeyRound size={15} /> Connect MT5 now</span>
        <span className={cn("rounded-full px-2 py-1 text-[10px] font-black uppercase", connectNow ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-zinc-400")}>{connectNow ? "On" : "Later"}</span>
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
        <span className="grid size-10 place-items-center rounded-xl bg-white/10 text-zinc-200">
          {isManual ? <Pencil size={18} /> : isCsv ? <Database size={18} /> : <KeyRound size={18} />}
        </span>
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
      <p className="flex items-center gap-2 font-black text-zinc-100"><span className="grid size-5 place-items-center rounded-full bg-white text-[11px] text-black">{number}</span>{title}</p>
      <p className="mt-1 pl-7 text-xs leading-5 text-zinc-500">{text}</p>
    </div>
  );
}
