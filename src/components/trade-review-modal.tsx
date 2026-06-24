"use client";

import { Camera, Check, ChevronDown, ImagePlus, LoaderCircle, Plus, Trash2, X } from "lucide-react";
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
  onSave: (form: FormData) => Promise<{ id: string; symbol: string; side: string; pnl: number; resultR: number | null; note: string | null; setup: string | null } | null>;
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
      <label className="text-[10px] font-semibold uppercase tracking-widest text-[#8a8a8a]">{label}</label>
      <Input
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="border-[#2a2a2a] bg-[#121212] font-mono text-sm focus:border-zinc-500 focus:ring-1 focus:ring-white/10 transition-all"
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8a8a8a]">{children}</p>
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
    blue: "bg-white/[.08] text-zinc-300 ring-white/15",
    violet: "bg-white/[.08] text-zinc-300 ring-white/15",
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

  const selectOption = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <div className="relative space-y-1.5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={`flex h-10 w-full items-center justify-between gap-3 rounded-lg border px-3 text-left text-[12px] font-semibold transition ${
          open
            ? "border-white/20 bg-[#171717] ring-1 ring-white/10"
            : "border-[#2a2a2a] bg-[#121212] hover:border-[#3a3a3a]"
        }`}
      >
        <span className={value ? "truncate" : "truncate text-[#8a8a8a]"}>{value || placeholder}</span>
        <ChevronDown size={15} className={`shrink-0 text-[#8a8a8a] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[80] overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#121212] shadow-2xl shadow-black/50">
          <div className="max-h-56 overflow-y-auto p-1.5">
            {options.length ? options.map((option) => {
              const active = value === option;
              return (
                <div
                  key={option}
                  className={`group flex min-h-10 items-center gap-2 rounded-lg px-2.5 text-[12px] transition ${
                    active
                      ? `${toneClass} ring-1`
                      : "text-[#a1a1aa] hover:bg-white/[.045] hover:text-[#f1f1f1]"
                  }`}
                >
                  <button type="button" onClick={() => selectOption(option)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <Check size={13} className={active ? "shrink-0 opacity-100" : "shrink-0 opacity-0"} />
                    <span className="truncate font-semibold">{option}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(option);
                    }}
                    className="grid size-7 shrink-0 place-items-center rounded-md text-[#8a8a8a] opacity-70 hover:bg-rose-500/10 hover:text-rose-300 sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label={`${option} optionni o'chirish`}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            }) : (
              <div className="px-3 py-4 text-center text-xs text-[#8a8a8a]">Option yo'q.</div>
            )}
          </div>
          <div className="flex min-h-10 items-center gap-2 border-t border-[#2a2a2a] bg-[#121212] px-2 py-1.5">
            <Plus size={14} className="shrink-0 text-[#8a8a8a]" />
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
              className="min-w-0 flex-1 bg-transparent text-[12px] text-[#f1f1f1] outline-none placeholder:text-[#8a8a8a]"
            />
            <button type="button" onClick={add} className="rounded-md px-2 py-1 text-[11px] font-bold text-[#a1a1aa] hover:bg-white/[.05] hover:text-white">
              Add
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TradeReviewModal({ open, saving, account, onOpenChange, onSave }: TradeReviewModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
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
  const [outcome, setOutcome] = useState<"win" | "loss">("win");


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
    setImageUrls([]); setPreviewUrl(""); setUploadError("");
    if (inputRef.current) inputRef.current.value = "";
    setFollowingPlan(true); setErrorMade(false); setMistakeType("");
    setReviewCompleted(false); setToBible(false); setSession(""); setRiskPct(""); setSetup(""); setOutcome("win");
  };
  const close = (next: boolean) => { onOpenChange(next); if (!next) resetForm(); };

  const upload = async (files?: FileList | File[]) => {
    const selected = Array.from(files ?? []).slice(0, 3 - imageUrls.length);
    if (!selected.length) return;
    setUploading(true); setUploadError("");
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const form = new FormData();
        form.append("image", file);
        const r = await fetch("/api/journal/image", { method: "POST", body: form, credentials: "same-origin" });
        const p = (await r.json()) as { imageUrl?: string; error?: string };
        if (!r.ok || !p.imageUrl) throw new Error(p.error || "Rasm yuklanmadi.");
        uploaded.push(p.imageUrl);
      }
      setImageUrls((current) => [...current, ...uploaded].slice(0, 3));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Rasm yuklanmadi.");
    } finally { setUploading(false); }
  };

  const drop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); void upload(e.dataTransfer.files); };
  const submit = async (form: FormData) => {
    const amount = Math.abs(Number(String(form.get("pnl") || "0").replace(",", ".")) || 0);
    form.set("pnl", String(outcome === "loss" ? -amount : amount));
    const entry = await onSave(form);
    if (entry) {
      resetForm();
      close(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      {/* Custom close button lives in the modal header. */}
      <DialogContent
        showCloseButton={false}
        className="max-h-[95dvh] overflow-hidden border border-[#2a2a2a] bg-[#0b0b0b] p-0 sm:max-w-3xl shadow-2xl shadow-black/70"
      >
        {/* Header */}
        <div className="relative flex items-center gap-3 border-b border-[#2a2a2a] bg-[#171717] px-5 py-4">
          {/* gradient accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.06] ring-1 ring-white/10">
            <Plus size={16} className="text-zinc-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-[#f1f1f1] truncate">Yangi trade review</h2>
            <p className="text-[11px] text-[#8a8a8a] truncate">{account?.name} / {account?.marketType}</p>
          </div>
          <button
            onClick={() => close(false)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-[#8a8a8a] transition hover:bg-[#2a2a2a] hover:text-[#f1f1f1]"
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
                  className="border-[#2a2a2a] bg-[#121212] focus:border-zinc-500 focus:ring-1 focus:ring-white/10 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <SectionLabel>Yo&apos;nalish</SectionLabel>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#2a2a2a] bg-[#121212] p-1.5">
                  <label className="cursor-pointer">
                    <input type="radio" name="side" value="Long" defaultChecked className="peer sr-only" />
                    <span className="block rounded-lg py-1.5 text-center text-xs font-bold text-[#8a8a8a] transition peer-checked:bg-emerald-500/15 peer-checked:text-emerald-300 peer-checked:ring-1 peer-checked:ring-emerald-500/30 hover:text-[#f1f1f1]">
                      Long
                    </span>
                  </label>
                  <label className="cursor-pointer">
                    <input type="radio" name="side" value="Short" className="peer sr-only" />
                    <span className="block rounded-lg py-1.5 text-center text-xs font-bold text-[#8a8a8a] transition peer-checked:bg-rose-500/15 peer-checked:text-rose-300 peer-checked:ring-1 peer-checked:ring-rose-500/30 hover:text-[#f1f1f1]">
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
                  className="border-[#2a2a2a] bg-[#121212]"
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

            <div className="space-y-2">
              <SectionLabel>Trade result</SectionLabel>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-[#101010] p-1">
                <button type="button" onClick={() => setOutcome("win")} className={`h-10 rounded-md text-xs font-black transition-colors ${outcome === "win" ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/25" : "text-zinc-500 hover:text-zinc-200"}`}>
                  Win
                </button>
                <button type="button" onClick={() => setOutcome("loss")} className={`h-10 rounded-md text-xs font-black transition-colors ${outcome === "loss" ? "bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/25" : "text-zinc-500 hover:text-zinc-200"}`}>
                  Loss
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">P&L summani musbat kiriting. Win yoki Loss ishorani avtomatik belgilaydi.</p>
            </div>

            {/* Numbers row 1: PnL + Lot + RR */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberField label={outcome === "win" ? "Profit $" : "Loss $"} name="pnl" placeholder="0.00" required />
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
                  className="border-[#2a2a2a] bg-[#121212] focus:border-zinc-500 transition-all"
                />
              </div>
            </div>

            {/* Trade Checklist */}
            <div className="rounded-xl border border-[#2a2a2a] bg-[#121212] p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#8a8a8a]">Trade checklist</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <CheckRow label="Following plan?" checked={followingPlan} onToggle={() => setFollowingPlan(v => !v)} tone="emerald" />
                <CheckRow label="Review completed" checked={reviewCompleted} onToggle={() => setReviewCompleted(v => !v)} tone="blue" />
                <CheckRow label="Error made?" checked={errorMade} onToggle={() => setErrorMade(v => !v)} tone="rose" />
                <CheckRow label="+ to Trading Bible?" checked={toBible} onToggle={() => setToBible(v => !v)} tone="violet" />
              </div>
              {errorMade && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#2a2a2a] pt-3">
                  {MISTAKES.map(m => (
                    <button key={m} type="button" onClick={() => setMistakeType(mistakeType === m ? "" : m)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                        mistakeType === m
                          ? "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30"
                          : "bg-[#1b1b1b] text-[#8a8a8a] hover:text-[#f1f1f1]"
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
                className="min-h-28 resize-y border-[#2a2a2a] bg-[#121212] text-sm focus:border-zinc-500 transition-all"
                placeholder="Pre-trade: sabab. Execution: kirish/chiqish. Review: xato va keyingi qoida."
              />
            </div>

            <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => void upload(e.target.files ?? undefined)} />
            <input type="hidden" name="imageUrls" value={JSON.stringify(imageUrls)} />

            <div className="rounded-xl border border-[#2a2a2a] bg-[#121212] p-3">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[.06] ring-1 ring-white/10">
                  <Camera size={16} className="text-zinc-300" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-[#f1f1f1]">Chart screenshot</h3>
                  <p className="truncate text-[11px] text-[#8a8a8a]">JPG, PNG yoki WEBP / max 5MB</p>
                </div>
                <button type="button" onClick={() => inputRef.current?.click()}
                  className="shrink-0 rounded-lg border border-[#2a2a2a] bg-[#171717] px-3 py-2 text-xs font-semibold text-[#a1a1aa] transition hover:border-white/20 hover:text-[#f1f1f1]">
                  + Add image
                </button>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()} onDrop={drop}
                className="grid grid-cols-3 gap-2 rounded-xl border border-dashed border-[#2a2a2a] bg-[#0b0b0b] p-2">
                {imageUrls.map((url, index) => <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-[#2a2a2a] bg-black"><button type="button" onClick={() => setPreviewUrl(url)} className="h-full w-full"><img src={url} alt={`Trade screenshot ${index + 1}`} className="h-full w-full object-cover" /></button><button type="button" onClick={() => setImageUrls((current) => current.filter((item) => item !== url))} className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-md bg-black/75 text-rose-200"><Trash2 size={12} /></button></div>)}
                {imageUrls.length < 3 ? <button type="button" onClick={() => inputRef.current?.click()} className="grid aspect-square place-items-center rounded-lg border border-dashed border-white/10 text-zinc-500 hover:bg-white/[.04] hover:text-white">{uploading ? <LoaderCircle className="animate-spin" size={20} /> : <ImagePlus size={22} />}</button> : null}
              </div>
              {uploadError && <p className="mt-2 text-xs text-rose-400">{uploadError}</p>}
            </div>

            <div className="rounded-xl border border-[#2a2a2a] bg-[#121212] p-3 text-[11px] leading-5 text-[#8a8a8a]">
              <b className="text-[#a1a1aa]">Review tavsiyasi:</b> trade ochilish sababi, invalidation nuqtasi va chiqish qarorini yozing.
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-[#2a2a2a] bg-[#0b0b0b]/95 p-4 backdrop-blur-xl sm:px-6">
            <Button
              disabled={saving || uploading}
              className="h-11 w-full bg-gradient-to-r from-zinc-100 to-zinc-300 text-black font-semibold shadow-lg shadow-black/30 transition-all hover:from-white hover:to-zinc-200"
            >
              {saving ? <LoaderCircle className="animate-spin" /> : <Plus size={16} />}
              Trade jurnalga saqlash
            </Button>
          </div>
        </form>
        {previewUrl ? <div className="fixed inset-0 z-[10001] grid place-items-center bg-black/90 p-3" onClick={() => setPreviewUrl("")}><button type="button" className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white"><X size={18} /></button><img src={previewUrl} alt="Trade screenshot preview" className="max-h-[92dvh] max-w-full object-contain" /></div> : null}
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
    blue: "border-white/25 bg-white/[.08] text-zinc-300",
    violet: "border-white/25 bg-white/[.08] text-zinc-300",
  };
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 text-left group">
      <span className={`grid size-5 shrink-0 place-items-center rounded-md border transition-all ${
        checked ? toneMap[tone] : "border-[#333333] bg-transparent text-transparent group-hover:border-[#454545]"
      }`}>
        {checked && "OK"}
      </span>
      <span className={`text-sm transition ${checked ? "text-[#f1f1f1]" : "text-[#8a8a8a] group-hover:text-[#a1a1aa]"}`}>
        {label}
      </span>
    </button>
  );
}
