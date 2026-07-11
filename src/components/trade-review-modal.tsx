"use client";

import { Check, ChevronDown, CloudUpload, ImagePlus, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { MediaImage } from "./media-image";
import { useWorkspacePreferences } from "./workspace-preferences-context";
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
const SETUPS = ["None", "BOS", "CHoCH", "Liquidity Sweep", "FVG", "OB", "Breakout", "Reversal", "Range"];
const MISTAKES = ["Erta kirish", "Kechiktirilgan kirish", "SL qoymaslik", "Ortiqcha risk", "Plansiz trade", "Revenge trade", "FOMO", "Erta yopish"];
const SYMBOLS = ["NAS100", "XAUUSD", "EURUSD", "GBPUSD", "US30", "GER30", "BTCUSD"];

const inputClass = "h-10 rounded-lg border-white/8 bg-[#111111] text-sm font-semibold text-white placeholder:text-zinc-600 focus:border-white/20 focus:ring-1 focus:ring-white/10";

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

function nowLocalDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-[14px] font-black leading-none text-zinc-100">{children}</label>;
}

function OptionStack({
  options,
  value,
  onChange,
  onAdd,
  onRemove,
  placeholder = "None",
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
        className={`flex h-10 w-full items-center justify-between gap-3 rounded-lg border px-3 text-left text-sm font-semibold transition ${open ? "border-white/20 bg-[#171717]" : "border-white/8 bg-[#111111] hover:border-white/15"}`}
      >
        <span className={value ? "truncate text-white" : "truncate text-zinc-500"}>{value || placeholder}</span>
        <ChevronDown size={15} className={`shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[100] overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0b] shadow-2xl shadow-black/70">
          <div className="max-h-52 overflow-y-auto p-1.5">
            {options.length ? options.map((option) => {
              const active = value === option;
              return (
                <div key={option} className={`group flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-xs transition ${active ? "bg-white/[.08] text-white" : "text-zinc-400 hover:bg-white/[.045] hover:text-white"}`}>
                  <button type="button" onClick={() => { onChange(option === "None" ? "" : option); setOpen(false); }} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <Check size={13} className={active ? "shrink-0 opacity-100" : "shrink-0 opacity-0"} />
                    <span className="truncate font-semibold">{option}</span>
                  </button>
                  {option !== "None" ? (
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
                  ) : null}
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

export function TradeReviewModal({ open, saving, account: _account, onOpenChange, onSave }: TradeReviewModalProps) {
  void _account;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { customSymbols, addCustomSymbol } = useWorkspacePreferences();
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
  const [symbol, setSymbol] = useState("NAS100");
  const [entryDateTime, setEntryDateTime] = useState(nowLocalDateTime);
  const [pnl, setPnl] = useState("");
  const [rr, setRr] = useState("");
  const [rating, setRating] = useState("0");
  const [session, setSession] = useState("");
  const [riskPct, setRiskPct] = useState("");
  const [setup, setSetup] = useState("");
  const [outcome, setOutcome] = useState<"win" | "loss">("win");
  const symbolOptions = useMemo(() => Array.from(new Set([...SYMBOLS, ...customSymbols])), [customSymbols]);

  const tradedDate = useMemo(() => entryDateTime.slice(0, 10) || new Date().toISOString().slice(0, 10), [entryDateTime]);

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
    setSymbol("NAS100");
    setEntryDateTime(nowLocalDateTime());
    setPnl("");
    setRr("");
    setRating("0");
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
        className="w-[calc(100vw-18px)] overflow-hidden rounded-[1.05rem] border border-white/10 bg-[#080808] p-0 shadow-2xl shadow-black/80 sm:max-w-[850px] lg:max-w-[850px]"
      >
        <div className="flex items-start gap-3 border-b border-white/8 px-4 py-3 sm:px-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black leading-tight text-white">Add Trade</h2>
            <p className="mt-0.5 truncate text-sm text-zinc-600">Enter the details of your trade.</p>
          </div>
          <button type="button" onClick={() => close(false)} className="grid size-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/[.06] hover:text-white" aria-label="Close">
            <X size={19} />
          </button>
        </div>

        <form action={submit} className="flex max-h-[calc(100dvh-20px-57px)] flex-col overflow-hidden sm:max-h-[calc(92dvh-57px)]">
          <div className="grid flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_395px]">
            <div className="space-y-4 p-4 sm:p-4">
              <div className="space-y-1.5">
                <FieldLabel>Symbol *</FieldLabel>
                <div className="relative">
                  <select
                    value={symbol}
                    onChange={(event) => setSymbol(event.target.value)}
                    className={`${inputClass} w-full appearance-none px-4 pr-10`}
                  >
                    {symbolOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                </div>
                <p className="text-sm text-zinc-600">Can&apos;t find a symbol? <button type="button" onClick={() => { const next = window.prompt("Custom symbol"); if (next) { addCustomSymbol(next); setSymbol(next.trim().toUpperCase()); } }} className="font-black text-white underline underline-offset-2">Create it</button></p>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Entry date *</FieldLabel>
                <Input
                  type="datetime-local"
                  value={entryDateTime}
                  onChange={(event) => setEntryDateTime(event.target.value)}
                  required
                  className={`${inputClass} px-4 text-base`}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>Side *</FieldLabel>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setOutcome("win")} className="hidden" aria-hidden="true" tabIndex={-1} />
                  <label className="cursor-pointer">
                    <input type="radio" name="side" value="Long" defaultChecked className="peer sr-only" />
                    <span className="inline-flex h-8 items-center rounded-lg px-4 text-sm font-black text-zinc-500 transition peer-checked:bg-white/[.08] peer-checked:text-white">Buy ↑</span>
                  </label>
                  <label className="cursor-pointer">
                    <input type="radio" name="side" value="Short" className="peer sr-only" />
                    <span className="inline-flex h-8 items-center rounded-lg px-4 text-sm font-black text-zinc-500 transition peer-checked:bg-white/[.08] peer-checked:text-white">Sell ↓</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>P&amp;L *</FieldLabel>
                <div className="flex items-center gap-2">
                  <span className="text-lg text-zinc-500">$</span>
                  <Input
                    name="pnl"
                    value={pnl}
                    onChange={(event) => setPnl(sanitizeDecimal(event.target.value))}
                    placeholder="Enter your P&L"
                    required
                    inputMode="decimal"
                    className={`${inputClass} flex-1 px-4`}
                  />
                </div>
                <div className="grid h-10 grid-cols-2 gap-1 rounded-lg border border-white/8 bg-[#111111] p-1">
                  <button type="button" onClick={() => setOutcome("win")} className={`rounded-md text-xs font-black transition ${outcome === "win" ? "bg-emerald-500/15 text-emerald-300" : "text-zinc-500 hover:text-zinc-200"}`}>Win</button>
                  <button type="button" onClick={() => setOutcome("loss")} className={`rounded-md text-xs font-black transition ${outcome === "loss" ? "bg-rose-500/15 text-rose-300" : "text-zinc-500 hover:text-zinc-200"}`}>Loss</button>
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Risk/Reward ratio</FieldLabel>
                <div className="flex items-center gap-3">
                  <Input
                    name="resultR"
                    value={rr}
                    onChange={(event) => setRr(sanitizeDecimal(event.target.value))}
                    placeholder="1:2"
                    inputMode="decimal"
                    required
                    className={`${inputClass} w-[62px] px-2 text-center font-mono text-xs`}
                  />
                  <div className="flex h-4 flex-1 overflow-hidden rounded-full bg-[#202020]">
                    <div className="w-1/2 bg-red-500" />
                    <div className="flex-1 bg-green-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Rating</FieldLabel>
                <div className="flex items-center gap-3">
                  <span className="w-7 text-sm font-medium text-zinc-400">{Number(rating) ? rating : "-"}</span>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={rating}
                    onChange={(event) => setRating(event.target.value)}
                    className="h-2 flex-1 accent-zinc-400"
                  />
                </div>
              </div>

              <button type="button" onClick={() => setAdvancedOpen((current) => !current)} className="flex items-center gap-2 rounded-lg py-1 text-sm font-semibold text-zinc-300 transition hover:text-white">
                <ChevronDown size={15} className={`transition-transform ${advancedOpen ? "rotate-180" : "-rotate-90"}`} />
                Advanced options
              </button>

              {advancedOpen ? (
                <div className="space-y-3 rounded-xl border border-white/10 bg-[#101010] p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <FieldLabel>Session</FieldLabel>
                      <OptionStack
                        options={sessionOptions}
                        value={session}
                        onChange={setSession}
                        onAdd={(value) => addOption("tradex-journal-session-options", setSessionOptions, sessionOptions, value)}
                        onRemove={(value) => removeOption("tradex-journal-session-options", setSessionOptions, sessionOptions, value, session, () => setSession(""))}
                        placeholder="None"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Risk %</FieldLabel>
                      <OptionStack
                        options={riskOptions}
                        value={riskPct}
                        onChange={setRiskPct}
                        onAdd={(value) => addOption("tradex-journal-risk-options", setRiskOptions, riskOptions, value)}
                        onRemove={(value) => removeOption("tradex-journal-risk-options", setRiskOptions, riskOptions, value, riskPct, () => setRiskPct(""))}
                        placeholder="None"
                      />
                    </div>
                  </div>
                  <Input name="tags" placeholder="Tags: A+ setup, NY, news" className={inputClass} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <CheckRow label="Following plan" checked={followingPlan} onToggle={() => setFollowingPlan((value) => !value)} tone="emerald" />
                    <CheckRow label="Review completed" checked={reviewCompleted} onToggle={() => setReviewCompleted((value) => !value)} tone="blue" />
                    <CheckRow label="Error made" checked={errorMade} onToggle={() => setErrorMade((value) => !value)} tone="rose" />
                    <CheckRow label="Add to Bible" checked={toBible} onToggle={() => setToBible((value) => !value)} tone="violet" />
                  </div>
                  {errorMade ? (
                    <div className="flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
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

              <input type="hidden" name="symbol" value={symbol} />
              <input type="hidden" name="tradedAt" value={tradedDate} />
              <input type="hidden" name="quantity" value="1" />
              <input type="hidden" name="fees" value="0" />
              <input type="hidden" name="riskAmount" value="0" />
              <input type="hidden" name="session" value={session} />
              <input type="hidden" name="riskPercent" value={riskPct} />
              <input type="hidden" name="setup" value={setup} />
              <input type="hidden" name="mistakeType" value={mistakeType} />
              {followingPlan ? <input type="hidden" name="followingPlan" value="true" /> : null}
              {errorMade ? <input type="hidden" name="errorMade" value="true" /> : null}
              {reviewCompleted ? <input type="hidden" name="reviewCompleted" value="true" /> : null}
              {toBible ? <input type="hidden" name="toTradingBible" value="true" /> : null}
            </div>

            <div className="space-y-4 border-t border-white/8 p-4 sm:p-4 lg:border-l lg:border-t-0">
              <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void upload(event.target.files ?? undefined)} />
              <input type="hidden" name="imageUrls" value={JSON.stringify(imageUrls)} />

              <div className="space-y-2">
                <FieldLabel>Screenshots</FieldLabel>
                <div onDragOver={(event) => event.preventDefault()} onDrop={drop} className="min-h-[250px] rounded-xl border border-white/8 bg-[#121212] p-3 sm:min-h-[252px]">
                  {imageUrls.length ? (
                    <div className="grid grid-cols-3 gap-2">
                      {imageUrls.map((url, index) => (
                        <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black">
                          <button type="button" onClick={() => setPreviewUrl(url)} className="h-full w-full">
                            <MediaImage src={url} alt={`Trade screenshot ${index + 1}`} className="h-full w-full object-cover" />
                          </button>
                          <button type="button" onClick={() => setImageUrls((current) => current.filter((item) => item !== url))} className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-lg bg-black/75 text-rose-200">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      {imageUrls.length < 3 ? (
                        <button type="button" onClick={() => inputRef.current?.click()} className="grid aspect-square place-items-center rounded-lg border border-dashed border-white/10 text-zinc-500 hover:bg-white/[.04] hover:text-white">
                          {uploading ? <LoaderCircle className="animate-spin" size={20} /> : <ImagePlus size={22} />}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <button type="button" onClick={() => inputRef.current?.click()} className="grid h-full min-h-[224px] w-full place-items-center rounded-lg text-center text-zinc-500 transition hover:bg-white/[.025] hover:text-zinc-300">
                      <span>
                        {uploading ? <LoaderCircle className="mx-auto animate-spin" size={30} /> : <CloudUpload className="mx-auto text-zinc-700" size={36} />}
                        <b className="mt-4 block text-sm text-white">Upload Screenshot</b>
                        <small className="mt-1 block text-sm text-zinc-600">Drop here, paste with Ctrl+V or click</small>
                      </span>
                    </button>
                  )}
                </div>
                {uploadError ? <p className="text-xs text-rose-400">{uploadError}</p> : null}
              </div>

              <div className="space-y-2">
                <FieldLabel>Notes</FieldLabel>
                <Textarea name="note" className="min-h-[86px] resize-y rounded-lg border-white/8 bg-[#111111] text-sm placeholder:text-zinc-600 focus:border-white/20" placeholder="Enter your trade notes" />
              </div>

              <div className="space-y-2">
                <FieldLabel>Strategy</FieldLabel>
                <OptionStack
                  options={setupOptions}
                  value={setup}
                  onChange={setSetup}
                  onAdd={(value) => addOption("tradex-journal-setup-options", setSetupOptions, setupOptions, value)}
                  onRemove={(value) => removeOption("tradex-journal-setup-options", setSetupOptions, setupOptions, value, setup, () => setSetup(""))}
                  placeholder="None"
                />
                <p className="text-sm text-zinc-600">Select a strategy to set confluences.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-white/8 bg-[#080808]/95 px-4 py-3">
            <Button type="button" variant="outline" onClick={() => close(false)} className="h-9 rounded-lg border-white/10 bg-[#111111] px-4 text-sm font-black text-zinc-200 hover:bg-white/[.06]">
              Cancel
            </Button>
            <Button disabled={saving || uploading} className="h-9 rounded-lg bg-white px-5 text-sm font-black text-black hover:bg-zinc-200">
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
