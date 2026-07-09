"use client";

import { Check, ChevronDown, ImagePlus, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { MediaImage } from "./media-image";
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

const fieldClass = "h-10 rounded-xl border-white/10 bg-[#111111] text-sm text-white placeholder:text-zinc-600 focus:border-white/20 focus:ring-1 focus:ring-white/10";

function storedOptions(key: string, fallback: string[]) {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = window.localStorage.getItem(key);
    if (saved === null) return fallback;
    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {
    return fallback;
  }
}

function sanitizeDecimal(raw: string): string {
  const cleaned = raw.replace(",", ".").replace(/[^0-9.-]/g, "");
  const parts = cleaned.split(".");
  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <label className="text-[11px] font-bold text-zinc-300">{children}</label>;
}

function NumberField({ label, name, defaultValue = "", placeholder, required }: { label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean }) {
  const [value, setValue] = useState(defaultValue);
  const onChange = (event: ChangeEvent<HTMLInputElement>) => setValue(sanitizeDecimal(event.target.value));

  return (
    <div className="space-y-1.5">
      <SectionLabel>{label}</SectionLabel>
      <Input
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`${fieldClass} font-mono`}
      />
    </div>
  );
}

function OptionStack({
  options,
  value,
  onChange,
  onAdd,
  onRemove,
  placeholder = "Select option",
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);

  const add = () => {
    const next = draft.trim();
    if (!next) return;
    onAdd(next);
    onChange(next);
    setDraft("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={`flex h-10 w-full items-center justify-between gap-3 rounded-xl border px-3 text-left text-sm font-semibold transition ${open ? "border-white/20 bg-[#171717]" : "border-white/10 bg-[#111111] hover:border-white/15"}`}
      >
        <span className={value ? "truncate text-white" : "truncate text-zinc-600"}>{value || placeholder}</span>
        <ChevronDown size={15} className={`shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[100] overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0b] shadow-2xl shadow-black/70">
          <div className="max-h-52 overflow-y-auto p-1.5">
            {options.length ? options.map((option) => {
              const active = value === option;
              return (
                <div key={option} className={`group flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-xs transition ${active ? "bg-white/[.08] text-white" : "text-zinc-400 hover:bg-white/[.045] hover:text-white"}`}>
                  <button type="button" onClick={() => { onChange(option); setOpen(false); }} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <Check size={13} className={active ? "shrink-0 opacity-100" : "shrink-0 opacity-0"} />
                    <span className="truncate font-semibold">{option}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(option);
                    }}
                    className="grid size-7 shrink-0 place-items-center rounded-md text-zinc-500 hover:bg-rose-500/10 hover:text-rose-300 sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label={`${option} optionni o'chirish`}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            }) : <div className="px-3 py-4 text-center text-xs text-zinc-500">Option yo'q.</div>}
          </div>

          <div className="flex min-h-10 items-center gap-2 border-t border-white/10 bg-[#0f0f0f] px-2 py-1.5">
            <Plus size={14} className="shrink-0 text-zinc-500" />
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  add();
                }
              }}
              placeholder="Create option"
              className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-600"
            />
            <button type="button" onClick={add} className="rounded-md px-2 py-1 text-[11px] font-bold text-zinc-400 hover:bg-white/[.05] hover:text-white">
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
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
    setImageUrls([]);
    setPreviewUrl("");
    setUploadError("");
    if (inputRef.current) inputRef.current.value = "";
    setFollowingPlan(true);
    setErrorMade(false);
    setMistakeType("");
    setReviewCompleted(false);
    setToBible(false);
    setAdvancedOpen(false);
    setSession("");
    setRiskPct("");
    setSetup("");
    setOutcome("win");
  };

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) resetForm();
  };

  const upload = async (files?: FileList | File[]) => {
    const selected = Array.from(files ?? []).slice(0, 3 - imageUrls.length);
    if (!selected.length) return;
    setUploading(true);
    setUploadError("");
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const form = new FormData();
        form.append("image", file);
        const response = await fetch("/api/journal/image", { method: "POST", body: form, credentials: "same-origin" });
        const payload = (await response.json()) as { imageUrl?: string; error?: string };
        if (!response.ok || !payload.imageUrl) throw new Error(payload.error || "Rasm yuklanmadi.");
        uploaded.push(payload.imageUrl);
      }
      setImageUrls((current) => [...current, ...uploaded].slice(0, 3));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Rasm yuklanmadi.");
    } finally {
      setUploading(false);
    }
  };

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void upload(event.dataTransfer.files);
  };

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
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-1rem)] max-w-[900px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#090909] p-0 shadow-2xl shadow-black/70 sm:max-w-[900px]"
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black leading-none text-white">Add Trade</h2>
            <p className="mt-1 truncate text-xs text-zinc-500">{account?.name ? `${account.name} / ${account.marketType}` : "Enter the details of your trade."}</p>
          </div>
          <button type="button" onClick={() => close(false)} className="grid size-9 shrink-0 place-items-center rounded-xl text-zinc-500 transition hover:bg-white/[.06] hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form action={submit} className="flex max-h-[calc(100dvh-1rem-58px)] flex-col overflow-hidden sm:max-h-[calc(92dvh-58px)]">
          <div className="grid flex-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_390px]">
            <div className="space-y-4 p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <SectionLabel>Symbol *</SectionLabel>
                  <Input name="symbol" placeholder="NAS100" required className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                  <SectionLabel>Entry date *</SectionLabel>
                  <Input name="tradedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className={fieldClass} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <SectionLabel>Side *</SectionLabel>
                  <div className="grid h-10 grid-cols-2 gap-1 rounded-xl border border-white/10 bg-[#111111] p-1">
                    <label className="cursor-pointer">
                      <input type="radio" name="side" value="Long" defaultChecked className="peer sr-only" />
                      <span className="grid h-8 place-items-center rounded-lg text-xs font-black text-zinc-500 transition peer-checked:bg-white/[.08] peer-checked:text-emerald-300">Buy ↑</span>
                    </label>
                    <label className="cursor-pointer">
                      <input type="radio" name="side" value="Short" className="peer sr-only" />
                      <span className="grid h-8 place-items-center rounded-lg text-xs font-black text-zinc-500 transition peer-checked:bg-white/[.08] peer-checked:text-rose-300">Sell ↓</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <SectionLabel>Result</SectionLabel>
                  <div className="grid h-10 grid-cols-2 gap-1 rounded-xl border border-white/10 bg-[#111111] p-1">
                    <button type="button" onClick={() => setOutcome("win")} className={`rounded-lg text-xs font-black transition ${outcome === "win" ? "bg-emerald-400/15 text-emerald-300" : "text-zinc-500 hover:text-zinc-200"}`}>Win</button>
                    <button type="button" onClick={() => setOutcome("loss")} className={`rounded-lg text-xs font-black transition ${outcome === "loss" ? "bg-rose-400/15 text-rose-300" : "text-zinc-500 hover:text-zinc-200"}`}>Loss</button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <NumberField label={outcome === "win" ? "Profit $ *" : "Loss $ *"} name="pnl" placeholder="0.00" required />
                <NumberField label="Risk/Reward *" name="resultR" placeholder="2.0" required />
                <NumberField label="Risk $" name="riskAmount" defaultValue="100" required />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <NumberField label="Lot / Qty" name="quantity" defaultValue="1" required />
                <NumberField label="Fees" name="fees" defaultValue="0" required />
                <div className="space-y-1.5">
                  <SectionLabel>Risk %</SectionLabel>
                  <OptionStack
                    options={riskOptions}
                    value={riskPct}
                    onChange={setRiskPct}
                    onAdd={(value) => addOption("tradex-journal-risk-options", setRiskOptions, riskOptions, value)}
                    onRemove={(value) => removeOption("tradex-journal-risk-options", setRiskOptions, riskOptions, value, riskPct, () => setRiskPct(""))}
                    placeholder="Risk %"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <SectionLabel>Session</SectionLabel>
                  <OptionStack
                    options={sessionOptions}
                    value={session}
                    onChange={setSession}
                    onAdd={(value) => addOption("tradex-journal-session-options", setSessionOptions, sessionOptions, value)}
                    onRemove={(value) => removeOption("tradex-journal-session-options", setSessionOptions, sessionOptions, value, session, () => setSession(""))}
                    placeholder="Session"
                  />
                </div>
                <div className="space-y-1.5">
                  <SectionLabel>Strategy / Setup</SectionLabel>
                  <OptionStack
                    options={setupOptions}
                    value={setup}
                    onChange={setSetup}
                    onAdd={(value) => addOption("tradex-journal-setup-options", setSetupOptions, setupOptions, value)}
                    onRemove={(value) => removeOption("tradex-journal-setup-options", setSetupOptions, setupOptions, value, setup, () => setSetup(""))}
                    placeholder="Strategy"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <SectionLabel>Tags</SectionLabel>
                <Input name="tags" placeholder="A+ setup, news, NY" className={fieldClass} />
              </div>

              <button type="button" onClick={() => setAdvancedOpen((current) => !current)} className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-[#101010] px-3 py-2.5 text-left text-sm font-semibold text-zinc-300 transition hover:bg-white/[.04]">
                <ChevronDown size={15} className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                Advanced options
              </button>

              {advancedOpen ? (
                <div className="rounded-xl border border-white/10 bg-[#101010] p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <CheckRow label="Following plan" checked={followingPlan} onToggle={() => setFollowingPlan((value) => !value)} tone="emerald" />
                    <CheckRow label="Review completed" checked={reviewCompleted} onToggle={() => setReviewCompleted((value) => !value)} tone="blue" />
                    <CheckRow label="Error made" checked={errorMade} onToggle={() => setErrorMade((value) => !value)} tone="rose" />
                    <CheckRow label="Add to Bible" checked={toBible} onToggle={() => setToBible((value) => !value)} tone="violet" />
                  </div>

                  {errorMade ? (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
                      {MISTAKES.map((mistake) => (
                        <button
                          key={mistake}
                          type="button"
                          onClick={() => setMistakeType(mistakeType === mistake ? "" : mistake)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${mistakeType === mistake ? "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30" : "bg-white/[.04] text-zinc-500 hover:text-white"}`}
                        >
                          {mistake}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <input type="hidden" name="session" value={session} />
              <input type="hidden" name="riskPercent" value={riskPct} />
              <input type="hidden" name="setup" value={setup} />
              <input type="hidden" name="mistakeType" value={mistakeType} />
              {followingPlan ? <input type="hidden" name="followingPlan" value="true" /> : null}
              {errorMade ? <input type="hidden" name="errorMade" value="true" /> : null}
              {reviewCompleted ? <input type="hidden" name="reviewCompleted" value="true" /> : null}
              {toBible ? <input type="hidden" name="toTradingBible" value="true" /> : null}
            </div>

            <div className="space-y-4 border-t border-white/10 p-4 sm:p-5 lg:border-l lg:border-t-0">
              <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void upload(event.target.files ?? undefined)} />
              <input type="hidden" name="imageUrls" value={JSON.stringify(imageUrls)} />

              <div className="space-y-2">
                <SectionLabel>Screenshots</SectionLabel>
                <div onDragOver={(event) => event.preventDefault()} onDrop={drop} className="min-h-[180px] rounded-2xl border border-dashed border-white/10 bg-[#111111] p-3 sm:min-h-[210px]">
                  {imageUrls.length ? (
                    <div className="grid grid-cols-3 gap-2">
                      {imageUrls.map((url, index) => (
                        <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black">
                          <button type="button" onClick={() => setPreviewUrl(url)} className="h-full w-full">
                            <MediaImage src={url} alt={`Trade screenshot ${index + 1}`} className="h-full w-full object-cover" />
                          </button>
                          <button type="button" onClick={() => setImageUrls((current) => current.filter((item) => item !== url))} className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-lg bg-black/75 text-rose-200">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      {imageUrls.length < 3 ? (
                        <button type="button" onClick={() => inputRef.current?.click()} className="grid aspect-square place-items-center rounded-xl border border-dashed border-white/10 text-zinc-500 hover:bg-white/[.04] hover:text-white">
                          {uploading ? <LoaderCircle className="animate-spin" size={20} /> : <ImagePlus size={22} />}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <button type="button" onClick={() => inputRef.current?.click()} className="grid h-full min-h-[154px] w-full place-items-center rounded-xl text-center text-zinc-500 transition hover:bg-white/[.025] hover:text-zinc-300 sm:min-h-[184px]">
                      <span>
                        {uploading ? <LoaderCircle className="mx-auto animate-spin" size={28} /> : <ImagePlus className="mx-auto" size={30} />}
                        <b className="mt-3 block text-sm text-zinc-200">Upload screenshot</b>
                        <small className="mt-1 block text-xs text-zinc-600">Drop here, paste later or click</small>
                      </span>
                    </button>
                  )}
                </div>
                {uploadError ? <p className="text-xs text-rose-400">{uploadError}</p> : null}
              </div>

              <div className="space-y-1.5">
                <SectionLabel>Notes</SectionLabel>
                <Textarea name="note" className="min-h-[126px] resize-y rounded-2xl border-white/10 bg-[#111111] text-sm placeholder:text-zinc-600 focus:border-white/20" placeholder="What did you see? Why entry? What should be repeated or removed?" />
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-[#101010] p-2 text-center">
                {[
                  ["Session", session || "-"],
                  ["Setup", setup || "-"],
                  ["Risk", riskPct || "-"],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0 rounded-xl bg-white/[.03] px-2 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">{label}</p>
                    <p className="mt-1 truncate text-xs font-black text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-[#090909]/95 px-4 py-3 sm:px-5">
            <Button type="button" variant="outline" onClick={() => close(false)} className="h-9 rounded-xl border-white/10 bg-[#111111] px-4 text-sm text-zinc-200 hover:bg-white/[.06]">
              Cancel
            </Button>
            <Button disabled={saving || uploading} className="h-9 rounded-xl bg-white px-5 text-sm font-black text-black hover:bg-zinc-200">
              {saving ? <LoaderCircle className="animate-spin" size={15} /> : null}
              Save
            </Button>
          </div>
        </form>

        {previewUrl ? (
          <div className="fixed inset-0 z-[10001] grid place-items-center bg-black/90 p-3" onClick={() => setPreviewUrl("")}> 
            <button type="button" className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white">
              <X size={18} />
            </button>
            <MediaImage src={previewUrl} alt="Trade screenshot preview" className="max-h-[92dvh] max-w-full object-contain" />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CheckRow({ label, checked, onToggle, tone }: { label: string; checked: boolean; onToggle: () => void; tone: "emerald" | "rose" | "blue" | "violet" }) {
  const toneMap: Record<string, string> = {
    emerald: "border-emerald-500/45 bg-emerald-500/15 text-emerald-300",
    rose: "border-rose-500/45 bg-rose-500/15 text-rose-300",
    blue: "border-white/25 bg-white/[.08] text-zinc-300",
    violet: "border-white/25 bg-white/[.08] text-zinc-300",
  };

  return (
    <button type="button" onClick={onToggle} className="group flex w-full items-center gap-2.5 rounded-xl px-1 py-1.5 text-left transition hover:bg-white/[.025]">
      <span className={`grid size-5 shrink-0 place-items-center rounded-md border text-[8px] font-black transition ${checked ? toneMap[tone] : "border-white/12 bg-transparent text-transparent group-hover:border-white/20"}`}>
        {checked ? "OK" : ""}
      </span>
      <span className={`text-sm transition ${checked ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"}`}>{label}</span>
    </button>
  );
}
