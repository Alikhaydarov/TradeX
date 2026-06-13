"use client";

import { Camera, ImagePlus, LoaderCircle, Plus, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState, type ComponentProps, type DragEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export function TradeReviewModal({ open, saving, account, onOpenChange, onSave }: TradeReviewModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const resetImage = () => {
    setImageUrl("");
    setUploadError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) resetImage();
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("image", file);
      const response = await fetch("/api/journal/image", { method: "POST", body: form, credentials: "same-origin" });
      const payload = (await response.json()) as { imageUrl?: string; error?: string };
      if (!response.ok || !payload.imageUrl) throw new Error(payload.error || "Rasm yuklanmadi.");
      setImageUrl(payload.imageUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Rasm yuklanmadi.");
    } finally {
      setUploading(false);
    }
  };

  const drop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    void upload(event.dataTransfer.files?.[0]);
  };

  const submit = async (form: FormData) => {
    await onSave(form);
    resetImage();
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto p-0 sm:max-w-4xl xl:max-w-5xl">
        <DialogHeader className="border-b px-5 py-4 sm:px-7">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-xl">Yangi trade review</DialogTitle>
            <Badge variant="outline" className="text-cyan-300">{account?.name}</Badge>
          </div>
          <DialogDescription>Trade tafsilotlari, psixologiya va chart screenshotini bitta joyda saqlang.</DialogDescription>
        </DialogHeader>

        <form action={submit} className="grid lg:grid-cols-[1.05fr_.95fr]">
          <div className="grid content-start gap-5 p-5 sm:grid-cols-2 sm:p-7 lg:border-r">
            <FormField label="Symbol" name="symbol" placeholder="XAUUSD" required />
            <div className="space-y-2"><Label>Yo&apos;nalish</Label><select name="side" className="h-9 w-full rounded-lg border bg-background px-3 text-sm"><option>Long</option><option>Short</option></select></div>
            <FormField label="Sana" name="tradedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            <FormField label="Setup / Strategiya" name="setup" placeholder="London breakout" />
            <FormField label="Entry narxi" name="entry" type="number" step="any" placeholder="0.00" required />
            <FormField label="Exit narxi" name="exit" type="number" step="any" placeholder="0.00" required />
            <FormField label="Lot / Miqdor" name="quantity" type="number" step="any" defaultValue="1" required />
            <FormField label="Risk miqdori" name="riskAmount" type="number" step="any" defaultValue="100" required />
            <FormField label="Komissiya" name="fees" type="number" step="any" defaultValue="0" required />
            <div className="space-y-2"><Label>Emotsiya</Label><select name="emotion" className="h-9 w-full rounded-lg border bg-background px-3 text-sm"><option>Confident</option><option>Neutral</option><option>Hesitant</option><option>FOMO</option><option>Revenge</option></select></div>
            <div className="space-y-2 sm:col-span-2"><Label>Tags</Label><Input name="tags" placeholder="London, BOS, A+ setup" /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Trade review / Xulosa</Label><Textarea name="note" className="min-h-32 resize-y" placeholder="Nima yaxshi bajarildi? Qayerda xato bo'ldi? Keyingi safar nimani o'zgartirasiz?" /></div>
          </div>

          <div className="flex min-h-[480px] flex-col bg-muted/15 p-5 sm:p-7">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Camera /></span><div><h3 className="font-semibold">Chart screenshot</h3><p className="text-xs text-muted-foreground">JPG, PNG yoki WEBP, maksimum 5MB</p></div></div>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
            <input type="hidden" name="imageUrl" value={imageUrl} />
            <div className="mt-5 flex min-h-72 flex-1 overflow-hidden rounded-2xl border border-dashed bg-background/45">
              {imageUrl ? <div className="relative flex w-full items-center justify-center p-3"><img src={imageUrl} alt="Trade chart preview" className="max-h-[430px] w-full rounded-xl object-contain" /><Button type="button" size="icon" variant="destructive" className="absolute right-4 top-4" onClick={resetImage} aria-label="Rasmni olib tashlash"><Trash2 /></Button></div> : <button type="button" className="flex w-full flex-col items-center justify-center p-8 text-center transition hover:bg-accent/30" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={drop}>{uploading ? <LoaderCircle className="size-10 animate-spin text-cyan-300" /> : <UploadCloud className="size-10 text-cyan-300" />}<b className="mt-4">{uploading ? "Rasm yuklanmoqda..." : "Screenshot tanlang yoki shu yerga tashlang"}</b><p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">Entry, stop-loss va take-profit ko‘rinadigan chart rasmini yuklang.</p></button>}
            </div>
            {uploadError ? <p className="mt-3 text-sm text-rose-300">{uploadError}</p> : null}
            {imageUrl ? <Button type="button" variant="outline" className="mt-3" onClick={() => inputRef.current?.click()}><ImagePlus /> Boshqa rasm tanlash</Button> : null}
            <div className="mt-5 rounded-xl border bg-background/55 p-4 text-xs leading-5 text-muted-foreground"><b className="text-foreground">Review tavsiyasi:</b> trade ochilish sababi, invalidation nuqtasi va chiqish qarorini yozing. Bu analytics sifatini oshiradi.</div>
            <Button disabled={saving || uploading} size="lg" className="mt-5 w-full">{saving ? <LoaderCircle className="animate-spin" /> : <Plus />} Trade jurnalga saqlash</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, ...props }: { label: string } & ComponentProps<typeof Input>) {
  return <div className="space-y-2"><Label>{label}</Label><Input {...props} /></div>;
}
