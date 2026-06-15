"use client";

import { Camera, CheckCircle2, ImagePlus, LoaderCircle, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { useRef, useState, type ComponentProps, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PropAccount } from "./types";

interface TradeReviewModalProps {
  open: boolean;
  saving: boolean;
  account: PropAccount | null;
  onOpenChange: (open: boolean) => void;
  onSave: (form: FormData) => void | Promise<void>;
}

const SESSIONS = ["London", "New York", "Asian", "London/NY Overlap", "Pre-London", "Other"];
const EMOTIONS = [
  { v: "Confident", emoji: "😎" },
  { v: "Neutral", emoji: "😐" },
  { v: "Hesitant", emoji: "😰" },
  { v: "FOMO", emoji: "😱" },
  { v: "Revenge", emoji: "🔥" },
];
const SETUPS = ["BOS", "CHoCH", "Liquidity Sweep", "FVG", "OB", "Breakout", "Reversal", "Range", "Other"];

export function TradeReviewModal({ open, saving, account, onOpenChange, onSave }: TradeReviewModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [followingPlan, setFollowingPlan] = useState(true);
  const [errorMade, setErrorMade] = useState(false);
  const [session, setSession] = useState("London");
  const [emotion, setEmotion] = useState("Neutral");
  const [setup, setSetup] = useState("");

  const resetImage = () => { setImageUrl(""); setUploadError(""); if (inputRef.current) inputRef.current.value = ""; };
  const close = (next: boolean) => { onOpenChange(next); if (!next) resetImage(); };

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
  const submit = async (form: FormData) => { await onSave(form); resetImage(); };

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
              <FF label="Symbol" name="symbol" placeholder="XAUUSD" required />
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7a96]">Yo'nalish</label>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#1a2235] bg-[#0d1525] p-1.5">
                  {["Long", "Short"].map(s => (
                    <label key={s} className="cursor-pointer">
                      <input type="radio" name="side" value={s} defaultChecked={s === "Long"} className="sr-only peer" />
                      <span className={`block rounded-lg py-1.5 text-center text-xs font-bold transition peer-checked:${s === "Long" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"} text-[#6b7a96] hover:text-[#dde6f8]`}>
                        {s === "Long" ? "▲ " : "▼ "}{s}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <FF label="Sana" name="tradedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>

            {/* Session */}
            <div className="mt-4 space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7a96]">Sessiya</label>
              <div className="flex flex-wrap gap-1.5">
                {SESSIONS.map(s => (
                  <button key={s} type="button" onClick={() => setSession(s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${session === s ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30" : "bg-[#0d1525] text-[#6b7a96] hover:bg-[#172336] hover:text-[#dde6f8]"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <input type="hidden" name="emotion" value={emotion} />
            </div>

            {/* Setup */}
            <div className="mt-4 space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7a96]">Setup</label>
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

            {/* Prices */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FF label="Entry narxi" name="entry" type="number" step="any" placeholder="0.00" required />
              <FF label="Exit narxi" name="exit" type="number" step="any" placeholder="0.00" required />
              <FF label="Lot / Miqdor" name="quantity" type="number" step="any" defaultValue="1" required />
              <FF label="Risk miqdori $" name="riskAmount" type="number" step="any" defaultValue="100" required />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <FF label="Komissiya $" name="fees" type="number" step="any" defaultValue="0" required />
              <FF label="Tags" name="tags" placeholder="London, BOS, A+ setup" />
            </div>

            {/* Emotion */}
            <div className="mt-4 space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7a96]">Emotsiya</label>
              <div className="flex gap-2">
                {EMOTIONS.map(e => (
                  <button key={e.v} type="button" onClick={() => setEmotion(e.v)}
                    title={e.v}
                    className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 text-xl transition ${emotion === e.v ? "border-blue-500/40 bg-blue-500/10" : "border-[#1a2235] bg-[#0d1525] opacity-50 hover:opacity-80"}`}>
                    <span>{e.emoji}</span>
                    <span className="text-[9px] font-medium text-[#6b7a96]">{e.v}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Plan / Error checkboxes — Notion style */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setFollowingPlan(v => !v)}
                className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition ${followingPlan ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-[#1a2235] bg-[#0d1525] text-[#6b7a96]"}`}>
                <CheckCircle2 size={16} className={followingPlan ? "text-emerald-400" : "text-[#1e2d45]"} />
                Planga mos trade
              </button>
              <button type="button" onClick={() => setErrorMade(v => !v)}
                className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition ${errorMade ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-[#1a2235] bg-[#0d1525] text-[#6b7a96]"}`}>
                <X size={16} className={errorMade ? "text-rose-400" : "text-[#1e2d45]"} />
                Xato qilindi
              </button>
            </div>
            <input type="hidden" name="followingPlan" value={followingPlan ? "true" : "false"} />
            <input type="hidden" name="errorMade" value={errorMade ? "true" : "false"} />

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
                    <button type="button" onClick={resetImage}
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

function FF({ label, ...props }: { label: string } & ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7a96]">{label}</label>
      <Input {...props} className="border-[#1a2235] bg-[#0d1525] focus:border-blue-500/50" />
    </div>
  );
}
