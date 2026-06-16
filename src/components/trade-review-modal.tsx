"use client";

import { Camera, ImagePlus, LoaderCircle, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
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
const MISTAKES = ["Erta kirish", "Kechiktirilgan kirish", "SL qo'ymaslik", "Ortiqcha risk", "Plansiz trade", "Revenge trade", "FOMO", "Erta yopish"];

// Faqat raqam, nuqta va minusga ruxsat — vergul (",") avtomatik nuqtaga aylanadi, locale muammosi yo'q
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
      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7a96]">{label}</label>
      <Input
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="border-[#1a2235] bg-[#0d1525] font-mono focus:border-blue-500/50"
      />
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
  const [session, setSession] = useState("London");
  const [riskPct, setRiskPct] = useState("1.0%");
  const [setup, setSetup] = useState("");

  const resetForm = () => {
    setImageUrl(""); setUploadError("");
    if (inputRef.current) inputRef.current.value = "";
    setFollowingPlan(true); setErrorMade(false); setMistakeType("");
    setReviewCompleted(false); setToBible(false); setSession("London"); setRiskPct("1.0%"); setSetup("");
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

  const drop = (e: DragEvent<HTMLButtonElement>) => { e.preventDefault(); void upload(e.dataTransfer.files?.[0]); };
  const submit = async (form: FormData) => { await onSave(form); resetForm(); };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[96dvh] overflow-hidden border-[#1a2235] bg-[#060b14] p-0 sm:max-w-5xl">
        {/* Header */}
        <div className="relative overflow-hidden border-b border-[#1a2235]">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-violet-500/5" />
          <div className="relative flex items-center gap-3 px-5 py-4">
            <DialogHeader className="flex-1">
              <DialogTitle className="text-lg font-bold">Yangi trade review</DialogTitle>
              <p className="text-xs text-[#6b7a96]">{account?.name} · {account?.marketType}</p>
            </DialogHeader>
            <button onClick={() => close(false)} className="grid size-8 place-items-center rounded-lg text-[#6b7a96] hover:bg-[#172336] hover:text-[#dde6f8]">
              <X size={16} />
            </button>
          </div>
        </div>

        <form action={submit} className="flex max-h-[calc(96dvh-65px)] flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          {/* Left: Fields */}
          <div className="flex-1 overflow-y-auto p-5 lg:p-6">
            {/* Symbol + Side + Date */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7a96]">Pair / Symbol</label>
                <Input name="symbol" placeholder="XAUUSD" required className="border-[#1a2235] bg-[#0d1525] focus:border-blue-500/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7a96]">Yo&apos;nalish</label>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#1a2235] bg-[#0d1525] p-1.5">
                  <label className="cursor-pointer">
                    <input type="radio" name="side" value="Long" defaultChecked className="peer sr-only" />
                    <span className="block rounded-lg py-1.5 text-center text-xs font-bold text-[#6b7a96] transition peer-checked:bg-emerald-500/20 peer-checked:text-emerald-300 hover:text-[#dde6f8]">
                      ▲ Long
                    </span>
                  </label>
                  <label className="cursor-pointer">
                    <input type="radio" name="side" value="Short" className="peer sr-only" />
                    <span className="block rounded-lg py-1.5 text-center text-xs font-bold text-[#6b7a96] transition peer-checked:bg-rose-500/20 peer-checked:text-rose-300 hover:text-[#dde6f8]">
                      ▼ Short
                    </span>
                  </label>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7a96]">Sana</label>
                <Input name="tradedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="border-[#1a2235] bg-[#0d1525]" />
              </div>
            </div>

            {/* Session */}
            <div className="mt-4 space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7a96]">Session / Time</label>
              <div className="flex flex-wrap gap-1.5">
                {SESSIONS.map(s => (
                  <button key={s} type="button" onClick={() => setSession(s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${session === s ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30" : "bg-[#0d1525] text-[#6b7a96] hover:bg-[#172336] hover:text-[#dde6f8]"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <input type="hidden" name="session" value={session} />
            </div>

            {/* Strategy / Setup */}
            <div className="mt-4 space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7a96]">Strategy / Setup</label>
              <div className="flex flex-wrap gap-1.5">
                {SETUPS.map(s => (
                  <button key={s} type="button" onClick={() => setSetup(setup === s ? "" : s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${setup === s ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30" : "bg-[#0d1525] text-[#6b7a96] hover:bg-[#172336] hover:text-[#dde6f8]"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <input type="hidden" name="setup" value={setup} />
            </div>

            {/* Risk % + RR + Prices */}
            <div className="mt-4 space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7a96]">Risk %</label>
              <div className="flex gap-1.5">
                {RISK_PCT.map(r => (
                  <button key={r} type="button" onClick={() => setRiskPct(r)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${riskPct === r ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30" : "bg-[#0d1525] text-[#6b7a96] hover:text-[#dde6f8]"}`}>
                    {r}
                  </button>
                ))}
              </div>
              <input type="hidden" name="riskPercent" value={riskPct} />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberField label="Foyda / Ziyon $" name="pnl" placeholder="0.00" required />
              <NumberField label="Lot / Miqdor" name="quantity" defaultValue="1" required />
              <NumberField label="RR (Risk:Reward)" name="resultR" placeholder="2.5" required />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <NumberField label="Risk miqdori $" name="riskAmount" defaultValue="100" required />
              <NumberField label="Komissiya $" name="fees" defaultValue="0" required />
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7a96]">Tags</label>
                <Input name="tags" placeholder="A+ setup, news" className="border-[#1a2235] bg-[#0d1525] focus:border-blue-500/50" />
              </div>
            </div>

            {/* Notion checklist block */}
            <div className="mt-5 rounded-xl border border-[#1a2235] bg-[#0d1525]/60 p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#6b7a96]">Trade checklist</p>
              <div className="space-y-2.5">
                <CheckRow label="Following plan?" checked={followingPlan} onToggle={() => setFollowingPlan(v => !v)} tone="emerald" />
                <CheckRow label="Error made?" checked={errorMade} onToggle={() => setErrorMade(v => !v)} tone="rose" />
                {errorMade && (
                  <div className="ml-7 flex flex-wrap gap-1.5 pt-1">
                    {MISTAKES.map(m => (
                      <button key={m} type="button" onClick={() => setMistakeType(mistakeType === m ? "" : m)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${mistakeType === m ? "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30" : "bg-[#060b14] text-[#6b7a96] hover:text-[#dde6f8]"}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                )}
                <CheckRow label="Review completed" checked={reviewCompleted} onToggle={() => setReviewCompleted(v => !v)} tone="blue" />
                <CheckRow label="+ to Trading Bible?" checked={toBible} onToggle={() => setToBible(v => !v)} tone="violet" />
              </div>
            </div>
            <input type="hidden" name="followingPlan" value={followingPlan ? "true" : "false"} />
            <input type="hidden" name="errorMade" value={errorMade ? "true" : "false"} />
            <input type="hidden" name="mistakeType" value={mistakeType} />
            <input type="hidden" name="reviewCompleted" value={reviewCompleted ? "true" : "false"} />
            <input type="hidden" name="toTradingBible" value={toBible ? "true" : "false"} />

            {/* Note */}
            <div className="mt-4 space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7a96]">Trade review / Xulosa</label>
              <Textarea
                name="note"
                className="min-h-28 resize-y border-[#1a2235] bg-[#0d1525] text-sm"
                placeholder="Nima yaxshi bajarildi? Qayerda xato bo'ldi? Keyingi safar nimani o'zgartirasiz?"
              />
            </div>
          </div>

          {/* Right: Screenshot */}
          <div className="flex flex-col border-t border-[#1a2235] bg-[#03060e]/60 p-5 lg:w-[340px] lg:shrink-0 lg:border-l lg:border-t-0 lg:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-blue-500/10 text-blue-400">
                <Camera size={17} />
              </span>
              <div>
                <h3 className="text-sm font-semibold">Chart screenshot</h3>
                <p className="text-[11px] text-[#6b7a96]">JPG, PNG yoki WEBP · max 5MB</p>
              </div>
            </div>

            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => void upload(e.target.files?.[0])} />
            <input type="hidden" name="imageUrl" value={imageUrl} />

            <div className="mt-4 flex min-h-56 flex-1 overflow-hidden rounded-2xl border border-dashed border-[#1a2235] bg-[#0d1525]/50">
              {imageUrl
                ? <div className="relative flex w-full items-center justify-center p-3">
                    <img src={imageUrl} alt="chart" className="max-h-80 w-full rounded-xl object-contain" />
                    <button type="button" onClick={() => { setImageUrl(""); if (inputRef.current) inputRef.current.value = ""; }}
                      className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30">
                      <Trash2 size={14} />
                    </button>
                  </div>
                : <button type="button" onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()} onDrop={drop}
                    className="flex w-full flex-col items-center justify-center gap-3 p-8 text-center transition hover:bg-[#172336]/40">
                    {uploading
                      ? <LoaderCircle className="size-9 animate-spin text-blue-400" />
                      : <UploadCloud className="size-9 text-[#2a3f60]" />
                    }
                    <div>
                      <p className="text-sm font-medium text-[#6b7a96]">
                        {uploading ? "Yuklanmoqda..." : "Screenshot yuklang"}
                      </p>
                      <p className="mt-1 text-[11px] text-[#3a4f6a]">yoki shu yerga tashlang</p>
                    </div>
                  </button>
              }
            </div>

            {uploadError && <p className="mt-2 text-xs text-rose-400">{uploadError}</p>}
            {imageUrl && (
              <button type="button" onClick={() => inputRef.current?.click()}
                className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-[#1a2235] bg-[#0d1525] py-2 text-sm text-[#6b7a96] transition hover:text-[#dde6f8]">
                <ImagePlus size={14} /> Boshqa rasm
              </button>
            )}

            <div className="mt-4 rounded-xl border border-[#1a2235] bg-[#0d1525]/60 p-3 text-[11px] leading-5 text-[#6b7a96]">
              <b className="text-[#dde6f8]">Review tavsiyasi:</b> trade ochilish sababi, invalidation nuqtasi va chiqish qarorini yozing.
            </div>

            <Button disabled={saving || uploading} className="mt-4 h-11 w-full bg-blue-600 font-semibold hover:bg-blue-500">
              {saving ? <LoaderCircle className="animate-spin" /> : <Plus size={18} />}
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
    emerald: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
    rose: "border-rose-500/40 bg-rose-500/15 text-rose-400",
    blue: "border-blue-500/40 bg-blue-500/15 text-blue-400",
    violet: "border-violet-500/40 bg-violet-500/15 text-violet-400",
  };
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 text-left">
      <span className={`grid size-5 shrink-0 place-items-center rounded-md border transition ${checked ? toneMap[tone] : "border-[#1e2d45] bg-transparent text-transparent"}`}>
        {checked && "✓"}
      </span>
      <span className={`text-sm transition ${checked ? "text-[#dde6f8]" : "text-[#6b7a96]"}`}>{label}</span>
    </button>
  );
}