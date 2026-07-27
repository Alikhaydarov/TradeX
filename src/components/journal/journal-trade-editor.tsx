"use client";

import { ChevronDown, Download, ImageIcon, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Spinner } from "../ui/spinner";
import { Textarea } from "../ui/textarea";
import { MediaImage } from "../media-image";
import { TradingViewChart } from "../tradingview-chart";
import type { JournalEntry } from "../types";

const cash = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function JournalTradeEditor({
  trade,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  trade: JournalEntry;
  saving: boolean;
  onClose: () => void;
  onSave: (form: FormData) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [imageUrls, setImageUrls] = useState(
    trade.imageUrls?.length
      ? trade.imageUrls
      : trade.imageUrl
        ? [trade.imageUrl]
        : [],
  );
  const [previewUrl, setPreviewUrl] = useState("");
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const uploadTradeImages = async (files?: FileList | null) => {
    const selected = Array.from(files ?? []).slice(0, 3 - imageUrls.length);
    if (!selected.length) return;
    setUploadingImages(true);
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const form = new FormData();
        form.append("image", file);
        const response = await fetch("/api/journal/image", {
          method: "POST",
          credentials: "same-origin",
          body: form,
        });
        const payload = (await response.json()) as {
          imageUrl?: string;
          error?: string;
        };
        if (!response.ok || !payload.imageUrl)
          throw new Error(payload.error || "Image upload failed.");
        uploaded.push(payload.imageUrl);
      }
      setImageUrls((current) => [...current, ...uploaded].slice(0, 3));
    } finally {
      setUploadingImages(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black/88 p-2 pt-[max(.5rem,env(safe-area-inset-top))] pb-[max(.5rem,env(safe-area-inset-bottom))] sm:p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <form
        action={onSave}
        className="relative z-10 flex h-[calc(100dvh-1rem)] max-h-[920px] w-full max-w-5xl flex-col overflow-hidden rounded-[20px] border border-white/8 bg-[#070707] text-foreground shadow-2xl shadow-black/80 sm:h-auto sm:max-h-[92dvh] sm:rounded-[18px] lg:max-w-6xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:items-center sm:px-5 sm:py-4">
          <div className="min-w-0 flex-1 py-0.5 sm:py-0">
            <h3 className="truncate text-base font-black sm:text-lg">
              {trade.symbol}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-black ${trade.side === "Long" ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}
              >
                {trade.side}
              </span>
              <span
                className={`shrink-0 rounded-lg px-2 py-0.5 font-mono text-[10px] font-black ${trade.pnl >= 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}
              >
                {trade.pnl >= 0 ? "+" : ""}
                {cash.format(trade.pnl)}
              </span>
              <p className="hidden text-xs text-zinc-500 sm:block">
                Trade review, edit and screenshots
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-zinc-500 transition hover:bg-[#111111] hover:text-white"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
          <section className="mb-4 overflow-hidden rounded-2xl border border-white/8">
            <div className="flex items-center justify-between border-b border-white/8 bg-[#050505] px-3 py-2 sm:px-4 sm:py-2.5">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">
                Chart · TradingView
              </p>
              <span className="text-[10px] text-zinc-600">{trade.symbol}</span>
            </div>
            <TradingViewChart
              symbol={trade.symbol}
              className="h-[240px] sm:h-[380px] lg:h-[440px]"
            />
          </section>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(300px,.88fr)]">
            <div className="space-y-4">
              <section className="rounded-2xl border border-white/8 bg-[#050505] p-4">
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">
                    Trade details
                  </p>
                  <h4 className="mt-1 text-sm font-black text-white">
                    Execution snapshot
                  </h4>
                </div>
                <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
                  <label className="col-span-2 min-w-0 text-xs text-muted-foreground sm:col-span-1">
                    Symbol
                    <Input
                      name="symbol"
                      defaultValue={trade.symbol}
                      className="mt-1"
                    />
                  </label>
                  <label className="min-w-0 text-xs text-zinc-500">
                    Side
                    <Select name="side" defaultValue={trade.side}>
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" align="start">
                        <SelectItem value="Long">Long</SelectItem>
                        <SelectItem value="Short">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="min-w-0 text-xs text-zinc-500">
                    Date
                    <Input
                      name="tradedAt"
                      type="date"
                      defaultValue={trade.rawDate}
                      className="mt-1"
                    />
                  </label>
                </div>
                <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
                  <label className="min-w-0 text-xs text-zinc-500">
                    PnL
                    <Input
                      name="pnl"
                      inputMode="decimal"
                      defaultValue={String(trade.pnl)}
                      className="mt-1"
                    />
                  </label>
                  <label className="min-w-0 text-xs text-zinc-500">
                    Quantity
                    <Input
                      name="quantity"
                      inputMode="decimal"
                      defaultValue={String(trade.quantity)}
                      className="mt-1"
                    />
                  </label>
                  <label className="col-span-2 min-w-0 text-xs text-zinc-500 sm:col-span-1">
                    Fees
                    <Input
                      name="fees"
                      inputMode="decimal"
                      defaultValue={String(trade.fees)}
                      className="mt-1"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-white/8 bg-[#050505] p-4">
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">
                    Context
                  </p>
                  <h4 className="mt-1 text-sm font-black text-white">
                    Risk, setup and tagging
                  </h4>
                </div>
                <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
                  <label className="text-xs text-zinc-500">
                    Risk $
                    <Input
                      name="riskAmount"
                      inputMode="decimal"
                      defaultValue={String(trade.riskAmount ?? 0)}
                      className="mt-1"
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    RR
                    <Input
                      name="resultR"
                      inputMode="decimal"
                      defaultValue={String(trade.resultR ?? 0)}
                      className="mt-1"
                    />
                  </label>
                  <label className="col-span-2 text-xs text-zinc-500 sm:col-span-1">
                    Risk %
                    <Input
                      name="riskPercent"
                      defaultValue={trade.riskPercent ?? ""}
                      className="mt-1"
                    />
                  </label>
                </div>
                <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
                  <label className="col-span-2 text-xs text-zinc-500 sm:col-span-1">
                    Setup
                    <Input
                      name="setup"
                      defaultValue={trade.setup ?? ""}
                      className="mt-1"
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    Session
                    <Input
                      name="session"
                      defaultValue={trade.session ?? ""}
                      className="mt-1"
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    Tags
                    <Input
                      name="tags"
                      defaultValue={(trade.tags ?? []).join(", ")}
                      className="mt-1"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-white/8 bg-[#050505] p-4">
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">
                    Review note
                  </p>
                  <h4 className="mt-1 text-sm font-black text-white">
                    What happened in this trade?
                  </h4>
                </div>
                <label className="block text-xs text-zinc-500">
                  Notes
                  <Textarea
                    name="note"
                    defaultValue={trade.note}
                    className="mt-1 min-h-36"
                  />
                </label>
              </section>
            </div>

            <div className="space-y-4">
              <section className="rounded-2xl border border-white/8 bg-[#050505] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">
                      Screenshots
                    </p>
                    <h4 className="mt-1 text-sm font-black text-white">
                      Chart capture
                    </h4>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {imageUrls.length}/3
                  </span>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) =>
                    void uploadTradeImages(event.target.files)
                  }
                />
                <input
                  type="hidden"
                  name="imageUrls"
                  value={JSON.stringify(imageUrls)}
                />
                <div className="grid grid-cols-3 gap-2">
                  {imageUrls.map((url, index) => (
                    <div
                      key={url}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewUrl(url);
                          setScreenshotOpen(true);
                        }}
                        className="h-full w-full"
                      >
                        <MediaImage
                          src={url}
                          alt={`${trade.symbol} screenshot ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setImageUrls((current) =>
                            current.filter((item) => item !== url),
                          )
                        }
                        className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-md bg-[#050505] text-rose-200"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {imageUrls.length < 3 ? (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="grid aspect-square place-items-center rounded-lg border border-dashed border-white/10 text-zinc-500 transition hover:bg-[#111111] hover:text-white"
                    >
                      {uploadingImages ? (
                        <Spinner className="size-5" />
                      ) : (
                        <Plus size={22} />
                      )}
                    </button>
                  ) : null}
                </div>
              </section>

              <section className="rounded-2xl border border-white/8 bg-[#050505] p-4">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">
                  Review checklist
                </p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-card px-3 text-sm text-foreground">
                    <Checkbox
                      name="followingPlan"
                      value="true"
                      defaultChecked={trade.followingPlan}
                    />{" "}
                    Following plan?
                  </label>
                  <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-card px-3 text-sm text-foreground">
                    <Checkbox
                      name="reviewCompleted"
                      value="true"
                      defaultChecked={trade.reviewCompleted}
                    />{" "}
                    Review completed
                  </label>
                  <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-card px-3 text-sm text-foreground">
                    <Checkbox
                      name="errorMade"
                      value="true"
                      defaultChecked={trade.errorMade}
                    />{" "}
                    Error made?
                  </label>
                  <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-card px-3 text-sm text-foreground">
                    <Checkbox
                      name="toTradingBible"
                      value="true"
                      defaultChecked={trade.toTradingBible}
                    />{" "}
                    Add to Trading Bible
                  </label>
                </div>
                <label className="mt-3 block text-xs text-zinc-500">
                  Mistake type
                  <Input
                    name="mistakeType"
                    defaultValue={trade.mistakeType ?? ""}
                    className="mt-1"
                  />
                </label>
              </section>

              <details className="group overflow-hidden rounded-2xl border">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm font-bold text-zinc-200 transition hover:bg-[#171717]">
                  <ImageIcon size={17} className="text-zinc-500" />
                  Share image
                  <span className="ml-auto text-xs font-medium text-zinc-600 group-open:hidden">
                    PNG yaratish
                  </span>
                  <ChevronDown
                    className="ml-auto hidden text-zinc-500 group-open:block"
                    size={16}
                  />
                </summary>
                <div className="border-t border-white/8 p-3 sm:p-4">
                  <TradeReviewImage trade={trade} chartUrls={imageUrls} />
                </div>
              </details>
            </div>
          </div>
        </div>
        <footer className="grid shrink-0 grid-cols-3 gap-2 border-t border-border bg-card p-3 sm:flex sm:p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" disabled={saving} variant="destructive">
                <Trash2 size={15} /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tradeni o&apos;chirish</AlertDialogTitle>
                <AlertDialogDescription>
                  {trade.symbol} trade jurnal va analytics hisobidan butunlay
                  o&apos;chadi. Bu amalni qaytarib bo&apos;lmaydi.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => void onDelete()}
                >
                  O&apos;chirish
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            disabled={saving}
            className="bg-white text-black hover:bg-zinc-200 sm:ml-auto"
          >
            {saving ? <Spinner className="size-[15px]" /> : null}
            <span className="sm:hidden">Save</span>
            <span className="hidden sm:inline">Save changes</span>
          </Button>
        </footer>
      </form>
      <Dialog open={screenshotOpen} onOpenChange={setScreenshotOpen}>
        <DialogContent className="max-h-[92dvh] max-w-[min(1100px,calc(100vw-1rem))] overflow-hidden border-border bg-background p-0 sm:max-w-[min(1100px,calc(100vw-2rem))]">
          <DialogHeader className="border-b border-border px-4 py-3 pr-14">
            <DialogTitle>{trade.symbol} screenshot</DialogTitle>
            <DialogDescription>
              Chart screenshotni to&apos;liq o&apos;lchamda ko&apos;rish
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[calc(92dvh-72px)] place-items-center overflow-auto bg-black p-2 sm:p-4">
            {previewUrl ? (
              <MediaImage
                src={previewUrl}
                alt={`${trade.symbol} full chart screenshot`}
                className="max-h-[calc(92dvh-104px)] max-w-full object-contain"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TradeReviewImage({
  trade,
  chartUrls,
}: {
  trade: JournalEntry;
  chartUrls: string[];
}) {
  const [generatedUrl, setGeneratedUrl] = useState("");

  useEffect(() => {
    let active = true;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const context = canvas.getContext("2d");
    if (!context) return;

    const winning = trade.pnl >= 0;
    const accent = winning ? "#42d99b" : "#fb7185";
    const date = new Date(`${trade.rawDate}T00:00:00`).toLocaleDateString(
      "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      },
    );

    const render = (chart: HTMLImageElement | null) => {
      const background = context.createLinearGradient(0, 0, 1080, 1080);
      background.addColorStop(0, "#0b0b0b");
      background.addColorStop(0.55, "#171717");
      background.addColorStop(1, "#232323");
      context.fillStyle = background;
      context.fillRect(0, 0, 1080, 1080);

      if (chart) {
        const scale = Math.max(1080 / chart.width, 1080 / chart.height);
        const width = chart.width * scale;
        const height = chart.height * scale;
        context.globalAlpha = 0.34;
        context.drawImage(
          chart,
          (1080 - width) / 2,
          (1080 - height) / 2,
          width,
          height,
        );
        context.globalAlpha = 1;
      } else {
        const candleHeights = [105, 174, 130, 238, 182, 310, 244];
        candleHeights.forEach((height, index) => {
          const x = 710 + index * 45;
          const y = 620 - height;
          context.strokeStyle = "rgba(212,212,216,.22)";
          context.lineWidth = 3;
          context.beginPath();
          context.moveTo(x + 12, y - 42);
          context.lineTo(x + 12, y + height + 42);
          context.stroke();
          context.fillStyle =
            index % 3 === 0 ? "rgba(66,217,155,.28)" : "rgba(212,212,216,.24)";
          context.fillRect(x, y, 24, height);
        });
      }

      const shade = context.createLinearGradient(0, 0, 1080, 0);
      shade.addColorStop(0, "rgba(11,11,11,.98)");
      shade.addColorStop(0.58, "rgba(11,11,11,.9)");
      shade.addColorStop(1, "rgba(11,11,11,.2)");
      context.fillStyle = shade;
      context.fillRect(0, 0, 1080, 1080);

      context.fillStyle = "#ffffff";
      context.font = "900 58px Arial, sans-serif";
      context.fillText("TRADEWAY", 82, 125);
      context.fillStyle = "#75819b";
      context.font = "500 30px Arial, sans-serif";
      context.fillText(date, 82, 245);

      context.fillStyle = "#ffffff";
      context.font = "900 72px Arial, sans-serif";
      context.fillText(trade.symbol, 82, 355);
      context.font = "700 38px Arial, sans-serif";
      context.fillText(trade.side, 82, 440);
      context.fillStyle = "rgba(255,255,255,.28)";
      context.fillRect(225, 400, 3, 50);
      context.fillStyle = accent;
      context.fillText(
        trade.pnl > 0 ? "WIN" : trade.pnl < 0 ? "LOSS" : "BE",
        260,
        440,
      );

      context.font = "900 92px Arial, sans-serif";
      context.fillText(`${(trade.resultR ?? 0).toFixed(2)}R`, 82, 565);
      context.font = "800 32px Arial, sans-serif";
      context.fillText(
        `${trade.pnl >= 0 ? "+" : ""}${cash.format(trade.pnl)}`,
        86,
        615,
      );

      context.fillStyle = "rgba(255,255,255,.13)";
      context.fillRect(82, 665, 916, 2);

      const drawMetric = (
        label: string,
        value: string,
        x: number,
        y: number,
      ) => {
        context.fillStyle = "#6f7b94";
        context.font = "600 27px Arial, sans-serif";
        context.fillText(label, x, y);
        context.fillStyle = "#ffffff";
        context.font = "800 39px Arial, sans-serif";
        context.fillText(value, x, y + 58);
      };

      drawMetric("Entry Price", String(trade.entry), 82, 750);
      drawMetric("Exit Price", String(trade.exit), 570, 750);
      drawMetric("Lot Size", String(trade.quantity), 82, 900);
      drawMetric(
        "Risk",
        trade.riskPercent || cash.format(trade.riskAmount || 0),
        330,
        900,
      );
      drawMetric("Setup", trade.setup || "Unspecified", 570, 900);

      context.strokeStyle = accent;
      context.lineWidth = 8;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(690, 550);
      context.bezierCurveTo(760, 500, 820, 430, 900, 330);
      context.stroke();
      context.fillStyle = accent;
      context.beginPath();
      context.moveTo(900, 330);
      context.lineTo(846, 350);
      context.lineTo(884, 392);
      context.closePath();
      context.fill();

      try {
        const url = canvas.toDataURL("image/png", 1);
        if (active) setGeneratedUrl(url);
      } catch {
        if (chart) render(null);
      }
    };

    const chartUrl = chartUrls[0] ?? "";
    if (chartUrl) {
      const chart = new window.Image();
      chart.crossOrigin = "anonymous";
      chart.onload = () => render(chart);
      chart.onerror = () => render(null);
      chart.src = chartUrl;
    } else {
      render(null);
    }

    return () => {
      active = false;
    };
  }, [chartUrls, trade]);

  const download = () => {
    if (!generatedUrl) return;
    const link = document.createElement("a");
    link.href = generatedUrl;
    link.download = `${trade.symbol}-${trade.rawDate}-tradeway.png`;
    link.click();
  };

  return (
    <section className="mx-auto w-full max-w-[380px] overflow-hidden rounded-2xl border border-white/10 bg-[#171717] shadow-xl shadow-black/25">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <p className="text-sm font-black text-white">Trade review image</p>
          <p className="text-xs text-zinc-500">1080 x 1080 PNG</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={!generatedUrl}
            onClick={download}
            size="sm"
            variant="outline"
            className="border-white/10 bg-[#0d0d0d] hover:bg-[#151515]"
          >
            <Download size={15} /> PNG
          </Button>
        </div>
      </div>
      {generatedUrl ? (
        <MediaImage
          src={generatedUrl}
          alt={`${trade.symbol} TradeWay review image`}
          className="aspect-square w-full bg-[#0b0b0b] object-contain"
        />
      ) : (
        <div className="grid aspect-square w-full place-items-center text-zinc-500">
          <Spinner className="size-6" />
        </div>
      )}
    </section>
  );
}

