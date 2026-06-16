"use client";

import { Camera, ImagePlus, LoaderCircle, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import type { PropAccount } from "./types";

interface TradeReviewModalProps {
  open: boolean;
  saving: boolean;
  account: PropAccount | null;
  onOpenChange: (open: boolean) => void;
  onSave: (form: FormData) => void | Promise<void>;
}

const SESSIONS = ["London", "New York", "Asian", "London/NY Overlap", "Pre-London"];
const RISK_PCT = ["0.25%", "0.5%", "1.0%", "2.0%", "4.0%"];
const SETUPS = ["BOS", "CHoCH", "Liquidity Sweep", "FVG", "OB", "Breakout", "Reversal", "Range"];
const MISTAKES = ["Erta kirish", "Kechiktirilgan kirish", "SL qoymaslik", "Ortiqcha risk", "Plansiz trade", "Revenge trade", "FOMO", "Erta yopish"];

function storedOptions(key: string, fallback: string[]) {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = window.localStorage.getItem(key);
    if (saved === null) return fallback;
    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    const clean = parsed.map((item) => String(item).trim()).filter(Boolean);
    return clean;
  } catch {
    return fallback;
  }
}

function sanitizeDecimal(raw: string): string {
  const cleaned = raw.replace(",", ".").replace(/[^0-9.-]/g, "");
  const parts = cleaned.split(".");
  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;
}

function NumberField({
  label, name, defaultValue = "", placeholder, required,
}: { label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean }) {
  const [value, setValue] = useState(defaultValue);
  const onChange = (e: ChangeEvent<HTMLInputElement>) => setValue(sanitizeDecimal(e.target.value));
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-widest text-[#4a5f7a]">{label}</label>
      <Input
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="border-[#1a2235] bg-[#060b14] font-mono text-sm focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all"
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#4a5f7a]">{children}</p>
  );
}

function OptionStack({
  options,
  value,
  onChange,
  onAdd,
  onRemove,
  tone,
  placeholder = "Add option",
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  tone: "blue" | "violet" | "amber";
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const toneClass = {
    blue: "bg-blue-500/15 text-blue-300 ring-blue-500/30",
    violet: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
    amber: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  }[tone];

  const add = () => {
    const next = draft.trim();
    if (!next) return;
    onAdd(next);
    onChange(next);
    setDraft("");
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex h-10 w-full items-center justify-between rounded-lg border border-[#1a2235] bg-[#060b14] px-3 text-left text-[12px] font-semibold text-[#dde6f8]">
        <span className={value ? "truncate" : "truncate text-[#4a5f7a]"}>{value || placeholder}</span>
        <span className="text-[#4a5f7a]">{open ? "Close" : "Options"}</span>
      </button>
      {open ? options.map((option) => {
        const active = value === option;
        return (
          <div
            key={option}
            className={`flex min-h-9 w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-[12px] font-semibold transition ${
              active
                ? `border-transparent ${toneClass} ring-1`
                : "border-[#141d2e] bg-[#0d1525] text-[#60708c] hover:border-[#22304a] hover:bg-[#111a2a] hover:text-[#dde6f8]"
            }`}
          >
            <button type="button" onClick={() => onChange(active ? "" : option)} className="min-w-0 flex-1 truncate text-left">
              {option}
            </button>
            <span className="ml-2 flex shrink-0 items-center gap-2">
              {active ? <span className="hidden text-[10px] uppercase tracking-widest opacity-80 sm:inline">Selected</span> : null}
              <button
                type="button"
                onClick={() => onRemove(option)}
                className="grid size-6 place-items-center rounded-md text-[#4a5f7a] hover:bg-rose-500/10 hover:text-rose-300"
                aria-label={`${option} optionni o'chirish`}
              >
                <X size={12} />
              </button>
            </span>
          </div>
        );
      }) : null}
      {open ? <div className="flex min-h-9 items-center gap-2 rounded-lg border border-dashed border-[#1a2235] bg-[#060b14] px-2 py-1.5">
        <Plus size={14} className="shrink-0 text-[#4a5f7a]" />
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-[12px] text-[#dde6f8] outline-none placeholder:text-[#4a5f7a]"
        />
        <button type="button" onClick={add} className="rounded-md px-2 py-1 text-[11px] font-bold text-[#8a9bc0] hover:bg-white/[.05] hover:text-white">
          Add
        </button>
      </div> : null}
    </div>
  );
}

export function TradeReviewModal({ open, saving, account, onOpenChange, onSave }: TradeReviewModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [followingPlan, setFollowingPlan] = useState(true);
  const [errorMade, setErrorMade] = useState(false);
  const [mistakeType, setMistakeType] = useState("");
  const [reviewCompleted, setReviewCompleted] = useState(false);
  const [toBible, setToBible] = useState(false);
  const [sessionOptions, setSessionOptions] = useState(() => storedOptions("tradex-journal-session-options", SESSIONS));
  const [setupOptions, setSetupOptions] = useState(() => storedOptions("tradex-journal-setup-options", SETUPS));
  const [riskOptions, setRiskOptions] = useState(() => storedOptions("tradex-journal-risk-options", RISK_PCT));
  const [session, setSession] = useState("");
  const [riskPct, setRiskPct] = useState("");
  const [setup, setSetup] = useState("");

  const addOption = (key: string, setOptions: (options: string[]) => void, current: string[], value: string) => {
    const nextValue = value.trim();
    if (!nextValue) return;
    const exists = current.some((item) => item.toLowerCase() === nextValue.toLowerCase());
    const next = exists ? current : [...current, nextValue];
    setOptions(next);
    if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(next));
  };

  const removeOption = (key: string, setOptions: (options: string[]) => void, current: string[], value: string, selected: string, clear: () => void) => {
    const next = current.filter((item) => item !== value);
    setOptions(next);
    if (selected === value) clear();
    if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(next));
  };

  const resetForm = () => {
    setImageUrl(""); setUploadError("");
    if (inputRef.current) inputRef.current.value = "";
    setFollowingPlan(true); setErrorMade(false); setMistakeType("");
    setReviewCompleted(false); setToBible(false); setSession(""); setRiskPct(""); setSetup("");
  };
  const close = (next: boolean) => { onOpenChange(next); if (!next) resetForm(); };

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true); setUploadError("");
    try {
      const form = new FormData();
      form.append("image", file);
      const r = await fetch("/api/journal/image", { method: "POST", body: form, credentials: "same-origin" });
      const p = (await r.json()) as { imageUrl?: string; error?: string };
      if (!r.ok || !p.imageUrl) throw new Error(p.error || "Rasm yuklanmadi.");
      setImageUrl(p.imageUrl);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Rasm yuklanmadi.");
    } finally { setUploading(false); }
  };

  const drop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); void upload(e.dataTransfer.files?.[0]); };
  const submit = async (form: FormData) => { await onSave(form); resetForm(); };

  return (
    <Dialog open={open} onOpenChange={close}>
      {/* Custom close button lives in the modal header. */}
      <DialogContent
        showCloseButton={false}
        className="max-h-[95dvh] overflow-hidden border border-[#141824] bg-[#05070c] p-0 sm:max-w-3xl shadow-2xl shadow-black/70"
      >
        {/* Header */}
        <div className="relative flex items-center gap-3 border-b border-[#111827] bg-[#070a12] px-5 py-4">
          {/* gradient accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
            <Plus size={16} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-[#dde6f8] truncate">Yangi trade review</h2>
            <p className="text-[11px] text-[#4a5f7a] truncate">{account?.name} / {account?.marketType}</p>
          </div>
          <button
            onClick={() => close(false)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-[#4a5f7a] transition hover:bg-[#1a2235] hover:text-[#dde6f8]"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <form action={submit} className="flex max-h-[calc(95dvh-61px)] flex-col overflow-hidden">

          {/* Left: fields */}
          <div className="flex-1 space-y-5 overflow-y-auto p-4 pb-28 sm:p-6">

            {/* Symbol + Side + Date */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <SectionLabel>Pair / Symbol</SectionLabel>
                <Input
                  name="symbol"
                  placeholder="XAUUSD"
                  required
                  className="border-[#1a2235] bg-[#060b14] focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <SectionLabel>Yo&apos;nalish</SectionLabel>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#1a2235] bg-[#060b14] p-1.5">
                  <label className="cursor-pointer">
                    <input type="radio" name="side" value="Long" defaultChecked className="peer sr-only" />
                    <span className="block rounded-lg py-1.5 text-center text-xs font-bold text-[#4a5f7a] transition peer-checked:bg-emerald-500/15 peer-checked:text-emerald-300 peer-checked:ring-1 peer-checked:ring-emerald-500/30 hover:text-[#dde6f8]">
                      Long
                    </span>
                  </label>
                  <label className="cursor-pointer">
                    <input type="radio" name="side" value="Short" className="peer sr-only" />
                    <span className="block rounded-lg py-1.5 text-center text-xs font-bold text-[#4a5f7a] transition peer-checked:bg-rose-500/15 peer-checked:text-rose-300 peer-checked:ring-1 peer-checked:ring-rose-500/30 hover:text-[#dde6f8]">
                      Short
                    </span>
                  </label>
                </div>
              </div>
              <div className="space-y-1.5">
                <SectionLabel>Sana</SectionLabel>
                <Input
                  name="tradedAt"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  required
                  className="border-[#1a2235] bg-[#060b14]"
                />
              </div>
            </div>

            {/* Session */}
            <div className="space-y-2">
              <SectionLabel>Session / Time</SectionLabel>
              <OptionStack
                options={sessionOptions}
                value={session}
                onChange={setSession}
                onAdd={(value) => addOption("tradex-journal-session-options", setSessionOptions, sessionOptions, value)}
                onRemove={(value) => removeOption("tradex-journal-session-options", setSessionOptions, sessionOptions, value, session, () => setSession(""))}
                tone="blue"
                placeholder="Add session"
              />
              <input type="hidden" name="session" value={session} />
            </div>

            {/* Strategy / Setup */}
            <div className="space-y-2">
              <SectionLabel>Strategy / Setup</SectionLabel>
              <OptionStack
                options={setupOptions}
                value={setup}
                onChange={setSetup}
                onAdd={(value) => addOption("tradex-journal-setup-options", setSetupOptions, setupOptions, value)}
                onRemove={(value) => removeOption("tradex-journal-setup-options", setSetupOptions, setupOptions, value, setup, () => setSetup(""))}
                tone="violet"
                placeholder="Add setup"
              />
              <input type="hidden" name="setup" value={setup} />
            </div>

            {/* Risk % */}
            <div className="space-y-2">
              <SectionLabel>Risk %</SectionLabel>
              <OptionStack
                options={riskOptions}
                value={riskPct}
                onChange={setRiskPct}
                onAdd={(value) => addOption("tradex-journal-risk-options", setRiskOptions, riskOptions, value)}
                onRemove={(value) => removeOption("tradex-journal-risk-options", setRiskOptions, riskOptions, value, riskPct, () => setRiskPct(""))}
                tone="amber"
                placeholder="Add risk %"
              />
              <input type="hidden" name="riskPercent" value={riskPct} />
            </div>

            {/* Numbers row 1: PnL + Lot + RR */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberField label="Foyda / Ziyon $" name="pnl" placeholder="0.00" required />
              <NumberField label="Lot / Miqdor" name="quantity" defaultValue="1" required />
              <NumberField label="RR (Risk:Reward)" name="resultR" placeholder="2.5" required />
            </div>

            {/* Numbers row 2: Risk + Fees + Tags */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberField label="Risk miqdori $" name="riskAmount" defaultValue="100" required />
              <NumberField label="Komissiya $" name="fees" defaultValue="0" required />
              <div className="space-y-1.5">
                <SectionLabel>Tags</SectionLabel>
                <Input
                  name="tags"
                  placeholder="A+ setup, news"
                  className="border-[#1a2235] bg-[#060b14] focus:border-blue-500/60 transition-all"
                />
              </div>
            </div>

            {/* Trade Checklist */}
            <div className="rounded-xl border border-[#141d2e] bg-[#060b14] p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#4a5f7a]">Trade checklist</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <CheckRow label="Following plan?" checked={followingPlan} onToggle={() => setFollowingPlan(v => !v)} tone="emerald" />
                <CheckRow label="Review completed" checked={reviewCompleted} onToggle={() => setReviewCompleted(v => !v)} tone="blue" />
                <CheckRow label="Error made?" checked={errorMade} onToggle={() => setErrorMade(v => !v)} tone="rose" />
                <CheckRow label="+ to Trading Bible?" checked={toBible} onToggle={() => setToBible(v => !v)} tone="violet" />
              </div>
              {errorMade && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#1a2235] pt-3">
                  {MISTAKES.map(m => (
                    <button key={m} type="button" onClick={() => setMistakeType(mistakeType === m ? "" : m)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                        mistakeType === m
                          ? "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30"
                          : "bg-[#0d1525] text-[#4a5f7a] hover:text-[#dde6f8]"
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input type="hidden" name="followingPlan" value={followingPlan ? "true" : "false"} />
            <input type="hidden" name="errorMade" value={errorMade ? "true" : "false"} />
            <input type="hidden" name="mistakeType" value={mistakeType} />
            <input type="hidden" name="reviewCompleted" value={reviewCompleted ? "true" : "false"} />
            <input type="hidden" name="toTradingBible" value={toBible ? "true" : "false"} />

            {/* Note */}
            <div className="space-y-1.5">
              <SectionLabel>Trade review / Xulosa</SectionLabel>
              <Textarea
                name="note"
                className="min-h-28 resize-y border-[#1a2235] bg-[#060b14] text-sm focus:border-blue-500/60 transition-all"
                placeholder="Pre-trade: sabab. Execution: kirish/chiqish. Review: xato va keyingi qoida."
              />
            </div>

            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => void upload(e.target.files?.[0])} />
            <input type="hidden" name="imageUrl" value={imageUrl} />

            <div className="rounded-xl border border-[#141d2e] bg-[#060b14] p-3">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
                  <Camera size={16} className="text-blue-400" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-[#dde6f8]">Chart screenshot</h3>
                  <p className="truncate text-[11px] text-[#4a5f7a]">JPG, PNG yoki WEBP / max 5MB</p>
                </div>
                <button type="button" onClick={() => inputRef.current?.click()}
                  className="shrink-0 rounded-lg border border-[#1a2235] bg-[#0b1220] px-3 py-2 text-xs font-semibold text-[#8a9bc0] transition hover:border-blue-500/40 hover:text-[#dde6f8]">
                  {imageUrl ? "Almashtirish" : "Yuklash"}
                </button>
              </div>

              <div onClick={() => !imageUrl && inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()} onDrop={drop}
                className="flex w-full items-center gap-3 overflow-hidden rounded-xl border border-dashed border-[#1a2235] bg-[#03050a] p-3 text-left transition hover:border-blue-500/35 hover:bg-[#080d17]">
              {imageUrl
                ? <>
                    <span className="relative grid h-16 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#1a2235] bg-black">
                      <img src={imageUrl} alt="chart" className="h-full w-full object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#dde6f8]">Screenshot ulandi</span>
                      <span className="mt-0.5 block truncate text-[11px] text-[#4a5f7a]">Jurnalga attachment sifatida qo&apos;shiladi</span>
                    </span>
                    <button type="button" onClick={() => { setImageUrl(""); if (inputRef.current) inputRef.current.value = ""; }}
                      className="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20">
                      <Trash2 size={13} />
                    </button>
                  </>
                : <>
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#0b1220] text-[#2a3f60]">
                    {uploading
                      ? <LoaderCircle className="size-5 animate-spin text-blue-400" />
                      : <UploadCloud className="size-5" />
                    }
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[#8a9bc0]">
                        {uploading ? "Yuklanmoqda..." : "Screenshot yuklang"}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[#4a5f7a]">bosib tanlang yoki shu yerga tashlang</span>
                    </span>
                    <ImagePlus size={16} className="shrink-0 text-[#4a5f7a]" />
                  </>
              }
              </div>
              {uploadError && <p className="mt-2 text-xs text-rose-400">{uploadError}</p>}
            </div>

            <div className="rounded-xl border border-[#1a2235] bg-[#060b14] p-3 text-[11px] leading-5 text-[#4a5f7a]">
              <b className="text-[#8a9bc0]">Review tavsiyasi:</b> trade ochilish sababi, invalidation nuqtasi va chiqish qarorini yozing.
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-[#141d2e] bg-[#05070c]/95 p-4 backdrop-blur-xl sm:px-6">
            <Button
              disabled={saving || uploading}
              className="h-11 w-full bg-gradient-to-r from-blue-600 to-blue-500 font-semibold shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-blue-400"
            >
              {saving ? <LoaderCircle className="animate-spin" /> : <Plus size={16} />}
              Trade jurnalga saqlash
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CheckRow({
  label, checked, onToggle, tone,
}: { label: string; checked: boolean; onToggle: () => void; tone: "emerald" | "rose" | "blue" | "violet" }) {
  const toneMap: Record<string, string> = {
    emerald: "border-emerald-500/50 bg-emerald-500/15 text-emerald-400",
    rose: "border-rose-500/50 bg-rose-500/15 text-rose-400",
    blue: "border-blue-500/50 bg-blue-500/15 text-blue-400",
    violet: "border-violet-500/50 bg-violet-500/15 text-violet-400",
  };
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 text-left group">
      <span className={`grid size-5 shrink-0 place-items-center rounded-md border transition-all ${
        checked ? toneMap[tone] : "border-[#1e2d45] bg-transparent text-transparent group-hover:border-[#2a3f60]"
      }`}>
        {checked && "OK"}
      </span>
      <span className={`text-sm transition ${checked ? "text-[#dde6f8]" : "text-[#4a5f7a] group-hover:text-[#8a9bc0]"}`}>
        {label}
      </span>
    </button>
  );
}
